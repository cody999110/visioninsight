from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.schemas.cleaning import CleaningPreviewResponse, CleaningSummary
from app.schemas.dataset import (
    ActivateResult,
    CompanyListResponse,
    CompanyView,
    ConfirmImportResult,
    CreateDatasetRequest,
    DatasetColumn,
    DatasetDetail,
    DatasetListResponse,
    DatasetSummary,
    UploadResult,
)
from app.services.dataset_store import dataset_store
from app.services.import_service import (
    ImportValidationError,
    confirm_dataset_import,
    export_dataset_csv,
    import_dataset_file,
    new_batch_id,
    reapply_cleaning,
)
from app.templates.definitions import get_template

router = APIRouter()


def _to_summary(record) -> DatasetSummary:
    return DatasetSummary(
        id=record.id,
        name=record.name,
        company=record.company,
        domain=record.domain,
        template_code=record.template_code,
        status=record.status,
        row_count=record.row_count,
        error_count=record.error_count,
        data_as_of=record.data_as_of,
        created_at=record.created_at,
        activated_at=record.activated_at,
    )


def _to_columns(record) -> list[DatasetColumn]:
    template = get_template(record.template_code)
    if template is None:
        return []
    return [DatasetColumn(key=col.key, label=col.label) for col in template.columns]


def _to_detail(record, preview_limit: int = 10) -> DatasetDetail:
    rows = record.pending_rows if record.status == "pending_confirm" and record.pending_rows else record.rows
    return DatasetDetail(
        **_to_summary(record).model_dump(),
        errors=record.errors,
        preview_rows=rows[:preview_limit],
        columns=_to_columns(record),
    )


def _summary_model(record) -> CleaningSummary | None:
    if not record.cleaning_summary:
        return None
    return CleaningSummary.model_validate(record.cleaning_summary)


@router.get("", response_model=DatasetListResponse)
def list_datasets(domain: str | None = Query(default=None)) -> DatasetListResponse:
    items = [_to_summary(record) for record in dataset_store.list_all(domain)]
    return DatasetListResponse(items=items, total=len(items))


@router.get("/companies", response_model=CompanyListResponse)
def list_companies() -> CompanyListResponse:
    items = [CompanyView(**company) for company in dataset_store.list_companies()]
    return CompanyListResponse(items=items, total=len(items))


@router.post("", response_model=DatasetDetail)
def create_dataset(payload: CreateDatasetRequest) -> DatasetDetail:
    template = get_template(payload.template_code)
    if template is None:
        raise HTTPException(status_code=400, detail=f"Unknown template: {payload.template_code}")
    if template.domain != payload.domain:
        raise HTTPException(status_code=400, detail="Template domain does not match dataset domain")

    record = dataset_store.create(payload.name, payload.company, payload.domain, payload.template_code)
    return _to_detail(record, preview_limit=0)


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    dataset_id: str,
    preview_limit: int = Query(default=10, ge=0, le=10000),
) -> DatasetDetail:
    record = dataset_store.get(dataset_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return _to_detail(record, preview_limit=preview_limit)


@router.get("/{dataset_id}/download")
def download_dataset(dataset_id: str) -> Response:
    record = dataset_store.get(dataset_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not record.rows:
        raise HTTPException(status_code=400, detail="Dataset has no rows to download")

    try:
        filename, content = export_dataset_csv(record)
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ascii_name = f"{record.domain}_{record.id[:8]}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote(filename)}'
            ),
        },
    )


@router.post("/{dataset_id}/upload", response_model=UploadResult)
async def upload_dataset(
    dataset_id: str,
    file: UploadFile = File(...),
    auto_confirm: bool = Query(
        default=False,
        description="True=直接入库；False=进入待确认，可先预览清洗结果",
    ),
) -> UploadResult:
    record = dataset_store.get(dataset_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await file.read()
    try:
        record = import_dataset_file(dataset_id, content, auto_confirm=auto_confirm)
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    needs_confirm = record.status == "pending_confirm"
    can_activate = record.status == "validated" and len(record.rows) > 0
    success_rows = len(record.pending_rows or []) if needs_confirm else len(record.rows)
    return UploadResult(
        batch_id=new_batch_id(),
        dataset_id=record.id,
        status=record.status,
        total_rows=record.row_count,
        success_rows=success_rows,
        error_rows=record.error_count,
        can_activate=can_activate,
        needs_confirm=needs_confirm,
        message="上传完成，请确认清洗结果后入库" if needs_confirm else "上传完成，请查看校验结果",
        errors=record.errors[:10],
        cleaning_summary=_summary_model(record),
    )


@router.get("/{dataset_id}/cleaning-preview", response_model=CleaningPreviewResponse)
def get_cleaning_preview(
    dataset_id: str,
    preview_limit: int = Query(default=30, ge=1, le=200),
) -> CleaningPreviewResponse:
    record = dataset_store.get(dataset_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    raw_rows = record.pending_raw_rows or record.raw_rows or []
    cleaned_rows = record.pending_rows or record.rows or []
    if not raw_rows and not cleaned_rows:
        raise HTTPException(status_code=400, detail="没有可预览的清洗数据，请先上传")

    summary = _summary_model(record) or CleaningSummary(
        total_rows=len(raw_rows),
        success_rows=len(cleaned_rows),
    )
    columns = [{"key": col.key, "label": col.label} for col in _to_columns(record)]
    return CleaningPreviewResponse(
        dataset_id=record.id,
        company=record.company,
        domain=record.domain,
        status=record.status,
        summary=summary,
        columns=columns,
        raw_preview=raw_rows[:preview_limit],
        cleaned_preview=cleaned_rows[:preview_limit],
        errors=record.errors[:20],
    )


@router.post("/{dataset_id}/confirm", response_model=ConfirmImportResult)
def confirm_import(dataset_id: str) -> ConfirmImportResult:
    try:
        record = confirm_dataset_import(dataset_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Dataset not found") from exc
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ConfirmImportResult(
        dataset_id=record.id,
        status=record.status,
        success_rows=len(record.rows),
        message="清洗结果已确认入库",
        cleaning_summary=_summary_model(record),
    )


@router.post("/{dataset_id}/reapply-cleaning", response_model=UploadResult)
def reapply_dataset_cleaning(
    dataset_id: str,
    auto_confirm: bool = Query(default=False),
) -> UploadResult:
    try:
        record = reapply_cleaning(dataset_id, auto_confirm=auto_confirm)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Dataset not found") from exc
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    needs_confirm = record.status == "pending_confirm"
    success_rows = len(record.pending_rows or []) if needs_confirm else len(record.rows)
    return UploadResult(
        batch_id=new_batch_id(),
        dataset_id=record.id,
        status=record.status,
        total_rows=record.row_count or success_rows,
        success_rows=success_rows,
        error_rows=record.error_count,
        can_activate=record.status == "validated" and len(record.rows) > 0,
        needs_confirm=needs_confirm,
        message="已按最新清洗规则重新处理，请确认后入库" if needs_confirm else "已按最新清洗规则重新入库",
        errors=record.errors[:10],
        cleaning_summary=_summary_model(record),
    )


@router.post("/{dataset_id}/activate", response_model=ActivateResult)
def activate_dataset(dataset_id: str) -> ActivateResult:
    record = dataset_store.get(dataset_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not record.rows:
        raise HTTPException(status_code=400, detail="Dataset has no valid rows")

    try:
        record = dataset_store.activate(dataset_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ActivateResult(dataset_id=record.id, status=record.status, message="Campaign 已激活，看板将展示上传数据")


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str) -> dict[str, bool]:
    if not dataset_store.delete(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"deleted": True}
