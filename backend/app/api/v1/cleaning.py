from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.cleaning import (
    CleaningConfig,
    CleaningConfigUpdate,
    CleaningDistincts,
    CleaningPreviewResponse,
    CleaningSummary,
)
from app.services.cleaning_config_store import cleaning_config_store
from app.services.cleaning_service import MAPPABLE_FIELDS, collect_field_distincts
from app.services.dataset_store import dataset_store

router = APIRouter()


@router.get("/config", response_model=CleaningConfig)
def get_cleaning_config(company: str = Query(..., min_length=1, max_length=100)) -> CleaningConfig:
    return cleaning_config_store.get(company)


@router.put("/config", response_model=CleaningConfig)
def put_cleaning_config(
    payload: CleaningConfigUpdate,
    company: str = Query(..., min_length=1, max_length=100),
) -> CleaningConfig:
    return cleaning_config_store.save(company, payload)


@router.get("/distincts", response_model=CleaningDistincts)
def get_cleaning_distincts(company: str = Query(..., min_length=1, max_length=100)) -> CleaningDistincts:
    fields: dict[str, set[str]] = {field: set() for field in MAPPABLE_FIELDS}
    for record in dataset_store.list_all():
        if record.company != company:
            continue
        source = record.raw_rows or record.rows or record.pending_raw_rows or []
        distincts = collect_field_distincts(source)
        for field, values in distincts.items():
            fields.setdefault(field, set()).update(values)
    return CleaningDistincts(
        company=company,
        fields={field: sorted(values) for field, values in fields.items() if values},
    )


@router.get("/fields")
def list_cleaning_fields() -> dict[str, list[str]]:
    return {
        "fields": list(MAPPABLE_FIELDS),
        "labels": {
            "entity_name": "主体",
            "business_line": "业务线",
            "department_name": "部门",
            "expense_category": "费用大类",
            "expense_subject": "费用科目",
            "customer_name": "客户",
            "product_name": "品名",
            "region": "销售区域",
            "province": "省份",
            "business_source": "业务来源",
        },
    }
