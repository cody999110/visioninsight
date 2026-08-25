from __future__ import annotations

import csv
import io
import uuid
from typing import Any

from app.schemas.cleaning import CleaningSummary
from app.services.cleaning_config_store import cleaning_config_store
from app.services.cleaning_service import apply_business_mappings
from app.services.dataset_store import DatasetRecord, dataset_store
from app.templates.definitions import ImportTemplateDefinition, get_template


class ImportValidationError(Exception):
    pass


def _parse_number(value: str) -> float | None:
    text = value.strip().replace(",", "").replace("¥", "").replace("$", "").replace("￥", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _normalize_date(value: str, month_only: bool = False) -> str | None:
    """Normalize dates like 2026/6/15, 2026.6.15, 2026-6 to canonical YYYY-MM-DD / YYYY-MM."""
    text = value.strip().replace("/", "-").replace(".", "-")
    if not text:
        return None
    parts = text.split("-")
    try:
        year = int(parts[0])
        month = int(parts[1]) if len(parts) > 1 and parts[1] else 1
        day = int(parts[2]) if len(parts) > 2 and parts[2] else 1
    except (ValueError, IndexError):
        return None
    if not (1 <= month <= 12):
        return None
    if month_only:
        return f"{year:04d}-{month:02d}"
    if not (1 <= day <= 31):
        day = 1
    return f"{year:04d}-{month:02d}-{day:02d}"


def _normalize_row(raw: dict[str, str], template: ImportTemplateDefinition) -> tuple[dict[str, Any], list[str]]:
    """Structural normalization only (types / required). Business mapping happens later."""
    errors: list[str] = []
    normalized: dict[str, Any] = {}

    for column in template.columns:
        raw_value = (raw.get(column.key) or "").strip()
        if not raw_value:
            if column.required:
                errors.append(f"缺少必填字段: {column.label}({column.key})")
            continue

        if column.column_type == "number":
            number = _parse_number(raw_value)
            if number is None:
                errors.append(f"字段 {column.label} 不是有效数值: {raw_value}")
            else:
                normalized[column.key] = number
        elif column.column_type in {"date", "month"}:
            canonical = _normalize_date(raw_value, month_only=column.column_type == "month")
            if canonical is None:
                errors.append(f"字段 {column.label} 不是有效日期: {raw_value}")
            else:
                normalized[column.key] = canonical
        else:
            # Campaign dimensions belong to each company upload.
            normalized[column.key] = raw_value

    return normalized, errors


def _read_csv_rows(content: bytes) -> tuple[list[str], list[dict[str, str]]]:
    text = content.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if len(rows) < 3:
        raise ImportValidationError("CSV 至少需要 3 行：字段 key、中文 label、数据行")

    keys = [cell.strip() for cell in rows[0]]
    data_rows: list[dict[str, str]] = []
    for row in rows[2:]:
        if not any(cell.strip() for cell in row):
            continue
        padded = row + [""] * (len(keys) - len(row))
        data_rows.append({keys[i]: padded[i] for i in range(len(keys))})
    return keys, data_rows


def _compute_data_as_of(rows: list[dict[str, Any]], template: ImportTemplateDefinition) -> str | None:
    date_keys = [col.key for col in template.columns if col.column_type in {"date", "month"}]
    if not date_keys:
        return None
    values: list[str] = []
    for row in rows:
        for key in date_keys:
            value = row.get(key)
            if isinstance(value, str) and value:
                values.append(value[:7])
    if not values:
        return None
    return max(values)


def _empty_summary(**overrides: Any) -> CleaningSummary:
    base = CleaningSummary()
    return base.model_copy(update=overrides)


def _commit_rows(
    record: DatasetRecord,
    *,
    raw_rows: list[dict[str, Any]],
    cleaned_rows: list[dict[str, Any]],
    summary: CleaningSummary,
    template: ImportTemplateDefinition,
    errors: list[str],
) -> DatasetRecord:
    record.raw_rows = raw_rows
    record.rows = cleaned_rows
    record.pending_rows = None
    record.pending_raw_rows = None
    record.cleaning_summary = summary.model_dump()
    record.row_count = summary.total_rows
    record.error_count = len(errors)
    record.errors = errors[:50]
    record.data_as_of = _compute_data_as_of(cleaned_rows, template)
    if cleaned_rows and not errors:
        record.status = "validated"
    elif cleaned_rows:
        record.status = "validated"
        record.errors = errors[:50]
    else:
        record.status = "failed"
    dataset_store.save(record)
    return record


def _snapshot_usable(record: DatasetRecord) -> dict[str, Any] | None:
    """Keep a restore point so a bad re-upload cannot erase already-usable data."""
    if record.status not in {"validated", "active", "pending_confirm"}:
        return None
    if not (record.rows or record.pending_rows):
        return None
    return {
        "status": record.status,
        "rows": list(record.rows),
        "raw_rows": list(record.raw_rows or []),
        "pending_rows": list(record.pending_rows) if record.pending_rows else None,
        "pending_raw_rows": list(record.pending_raw_rows) if record.pending_raw_rows else None,
        "row_count": record.row_count,
        "error_count": record.error_count,
        "errors": list(record.errors),
        "data_as_of": record.data_as_of,
        "cleaning_summary": record.cleaning_summary,
    }


def _restore_snapshot(record: DatasetRecord, snapshot: dict[str, Any]) -> None:
    record.status = snapshot["status"]
    record.rows = snapshot["rows"]
    record.raw_rows = snapshot["raw_rows"]
    record.pending_rows = snapshot["pending_rows"]
    record.pending_raw_rows = snapshot["pending_raw_rows"]
    record.row_count = snapshot["row_count"]
    record.error_count = snapshot["error_count"]
    record.errors = snapshot["errors"]
    record.data_as_of = snapshot["data_as_of"]
    record.cleaning_summary = snapshot["cleaning_summary"]


def _domain_label(domain: str) -> str:
    return {"expense": "费用", "revenue": "收入成本", "fund": "资金"}.get(domain, domain)


def _missing_columns_message(domain: str, missing_keys: list[str], present_keys: list[str]) -> str:
    label = _domain_label(domain)
    hint = ""
    present = set(present_keys)
    if {"amount", "expense_category", "expense_subject"} & present and domain != "expense":
        hint = " 检测到这更像「费用」模板文件，请确认左上角/上传页选择的是费用数据域。"
    elif {"revenue", "cost", "business_line", "product_name"} & present and domain != "revenue":
        hint = " 检测到这更像「收入成本」模板文件，请确认选择的是收入成本数据域。"
    elif {"income_amount", "expense_amount", "bank_account"} & present and domain != "fund":
        hint = " 检测到这更像「资金」模板文件，请确认选择的是资金数据域。"
    return (
        f"缺少「{label}」模板列: {', '.join(missing_keys)}。"
        f"请使用第 1 行为英文字段名、第 2 行为中文表头的 CSV。{hint}"
    )


def import_dataset_file(dataset_id: str, content: bytes, *, auto_confirm: bool = False) -> DatasetRecord:
    record = dataset_store.get(dataset_id)
    if record is None:
        raise KeyError(dataset_id)

    template = get_template(record.template_code)
    if template is None:
        raise ImportValidationError(f"未知模板: {record.template_code}")

    snapshot = _snapshot_usable(record)

    def fail(message: str) -> None:
        if snapshot is not None:
            _restore_snapshot(record, snapshot)
            dataset_store.save(record)
        else:
            record.status = "failed"
            record.pending_rows = None
            record.pending_raw_rows = None
            record.cleaning_summary = None
            record.errors = [message]
            record.error_count = 1
            dataset_store.save(record)
        raise ImportValidationError(message)

    record.status = "validating"
    dataset_store.save(record)

    try:
        keys, raw_csv_rows = _read_csv_rows(content)
    except ImportValidationError as exc:
        fail(str(exc))

    expected_keys = [col.key for col in template.columns]
    missing_keys = [key for key in expected_keys if key not in keys]
    if missing_keys:
        fail(_missing_columns_message(record.domain, missing_keys, keys))

    structural_rows: list[dict[str, Any]] = []
    all_errors: list[str] = []
    seen_doc_nos: set[str] = set()

    for index, raw in enumerate(raw_csv_rows, start=3):
        normalized, row_errors = _normalize_row(raw, template)
        doc_no = normalized.get("doc_no")
        if isinstance(doc_no, str):
            if doc_no in seen_doc_nos:
                row_errors.append(f"第 {index} 行单据号重复: {doc_no}")
            seen_doc_nos.add(doc_no)

        if row_errors:
            all_errors.extend([f"第 {index} 行: {msg}" for msg in row_errors])
            continue
        structural_rows.append(normalized)

    if not structural_rows:
        detail = "；".join(all_errors[:5]) if all_errors else "没有有效数据行"
        fail(detail)

    cleaning_config = cleaning_config_store.get(record.company)
    cleaned_rows, summary = apply_business_mappings(
        structural_rows,
        cleaning_config,
        template=template,
    )
    summary = summary.model_copy(
        update={
            "total_rows": len(raw_csv_rows),
            "success_rows": len(cleaned_rows),
            "error_rows": len(all_errors),
        }
    )

    if auto_confirm:
        return _commit_rows(
            record,
            raw_rows=structural_rows,
            cleaned_rows=cleaned_rows,
            summary=summary,
            template=template,
            errors=all_errors,
        )

    # Keep previously committed rows visible until user confirms the new batch.
    record.pending_raw_rows = structural_rows
    record.pending_rows = cleaned_rows
    record.cleaning_summary = summary.model_dump()
    record.row_count = len(raw_csv_rows)
    record.error_count = len(all_errors)
    record.errors = all_errors[:50]
    record.data_as_of = _compute_data_as_of(cleaned_rows, template) or record.data_as_of
    record.status = "pending_confirm"
    dataset_store.save(record)
    return record


def confirm_dataset_import(dataset_id: str) -> DatasetRecord:
    record = dataset_store.get(dataset_id)
    if record is None:
        raise KeyError(dataset_id)
    if record.status != "pending_confirm":
        raise ImportValidationError("当前数据集没有待确认的清洗结果")
    if not record.pending_rows:
        raise ImportValidationError("待确认数据为空")

    template = get_template(record.template_code)
    if template is None:
        raise ImportValidationError(f"未知模板: {record.template_code}")

    summary = CleaningSummary.model_validate(record.cleaning_summary or {})
    return _commit_rows(
        record,
        raw_rows=record.pending_raw_rows or [],
        cleaned_rows=record.pending_rows,
        summary=summary,
        template=template,
        errors=record.errors,
    )


def reapply_cleaning(dataset_id: str, *, auto_confirm: bool = False) -> DatasetRecord:
    """Re-run business mappings on stored raw_rows (or current rows as fallback)."""
    record = dataset_store.get(dataset_id)
    if record is None:
        raise KeyError(dataset_id)

    template = get_template(record.template_code)
    if template is None:
        raise ImportValidationError(f"未知模板: {record.template_code}")

    source_rows = record.raw_rows or record.rows
    if not source_rows:
        raise ImportValidationError("数据集没有可清洗的数据")

    cleaning_config = cleaning_config_store.get(record.company)
    cleaned_rows, summary = apply_business_mappings(
        source_rows,
        cleaning_config,
        template=template,
    )
    summary = summary.model_copy(
        update={
            "total_rows": len(source_rows),
            "success_rows": len(cleaned_rows),
            "error_rows": 0,
        }
    )

    if auto_confirm:
        return _commit_rows(
            record,
            raw_rows=source_rows,
            cleaned_rows=cleaned_rows,
            summary=summary,
            template=template,
            errors=[],
        )

    record.pending_raw_rows = source_rows
    record.pending_rows = cleaned_rows
    record.cleaning_summary = summary.model_dump()
    record.status = "pending_confirm"
    record.errors = []
    record.error_count = 0
    dataset_store.save(record)
    return record


def new_batch_id() -> str:
    return str(uuid.uuid4())


def _csv_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        text = f"{value:.10f}".rstrip("0").rstrip(".")
        return text or "0"
    return str(value)


def _safe_filename_part(text: str) -> str:
    cleaned = "".join("_" if ch in '\\/:*?"<>|' else ch for ch in text).strip()
    return cleaned or "dataset"


def export_dataset_csv(record: DatasetRecord) -> tuple[str, bytes]:
    """Rebuild an upload-compatible CSV (key row + label row + data rows)."""
    template = get_template(record.template_code)
    if template is None:
        raise ImportValidationError(f"未知模板: {record.template_code}")

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow([col.key for col in template.columns])
    writer.writerow([col.label for col in template.columns])
    for row in record.rows:
        writer.writerow([_csv_cell(row.get(col.key)) for col in template.columns])

    filename = f"{_safe_filename_part(record.company)}_{record.domain}.csv"
    return filename, buffer.getvalue().encode("utf-8-sig")
