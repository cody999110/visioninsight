from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.schemas.cleaning import (
    CleaningConfig,
    CleaningSummary,
    FieldChangeSummary,
    RowDiff,
    RowFieldDiff,
)
from app.templates.definitions import ImportTemplateDefinition

# Fields eligible for business dimension mapping / unmapped reporting.
MAPPABLE_FIELDS = (
    "entity_name",
    "business_line",
    "department_name",
    "expense_category",
    "expense_subject",
    "customer_name",
    "product_name",
    "region",
    "province",
    "business_source",
)


def _norm_key(value: Any) -> str:
    return str(value or "").strip().lower()


def build_mapping_index(config: CleaningConfig) -> dict[str, dict[str, str]]:
    """field -> {normalized_source: target}"""
    index: dict[str, dict[str, str]] = defaultdict(dict)
    for item in config.mappings:
        source = item.source.strip()
        target = item.target.strip()
        if not source or not target:
            continue
        index[item.field][_norm_key(source)] = target
    return dict(index)


def apply_business_mappings(
    rows: list[dict[str, Any]],
    config: CleaningConfig,
    *,
    template: ImportTemplateDefinition | None = None,
    sample_limit: int = 20,
) -> tuple[list[dict[str, Any]], CleaningSummary]:
    """Apply per-company dimension mappings on structurally normalized rows."""
    mapping_index = build_mapping_index(config)
    template_keys = {col.key for col in template.columns} if template else None

    cleaned_rows: list[dict[str, Any]] = []
    mapped_cells = 0
    changed_rows = 0
    change_counter: dict[tuple[str, str, str], int] = defaultdict(int)
    unmapped: dict[str, set[str]] = defaultdict(set)
    sample_diffs: list[RowDiff] = []

    for index, raw in enumerate(rows, start=3):
        cleaned = dict(raw)
        row_changes: list[RowFieldDiff] = []

        for field, sources in mapping_index.items():
            if template_keys is not None and field not in template_keys:
                continue
            before = cleaned.get(field)
            if before is None or before == "":
                continue
            before_text = str(before).strip() if config.trim_text else str(before)
            target = sources.get(_norm_key(before_text))
            if target is None:
                continue
            if before_text == target:
                continue
            cleaned[field] = target
            mapped_cells += 1
            change_counter[(field, before_text, target)] += 1
            row_changes.append(RowFieldDiff(field=field, before=before_text, after=target))

        # Collect unmapped values for mappable fields present in the row.
        for field in MAPPABLE_FIELDS:
            if template_keys is not None and field not in template_keys:
                continue
            value = cleaned.get(field)
            if value is None or value == "":
                continue
            text = str(value).strip()
            field_map = mapping_index.get(field, {})
            # Only report as unmapped if there is at least one mapping rule for this field
            # and this value was not remapped (already canonical or missing from map).
            if not field_map:
                continue
            # If value equals any target, treat as already standardized.
            targets = {str(v).strip().lower() for v in field_map.values()}
            if _norm_key(text) in field_map:
                continue
            if text.lower() in targets:
                continue
            # Was it mapped from something else this pass? check original
            original = raw.get(field)
            original_text = str(original).strip() if original is not None else ""
            if original_text and _norm_key(original_text) in field_map:
                continue
            unmapped[field].add(text)

        if row_changes:
            changed_rows += 1
            if len(sample_diffs) < sample_limit:
                sample_diffs.append(RowDiff(row_no=index, changes=row_changes))

        cleaned_rows.append(cleaned)

    field_changes = [
        FieldChangeSummary(field=field, before=before, after=after, count=count)
        for (field, before, after), count in sorted(
            change_counter.items(), key=lambda item: (-item[1], item[0][0], item[0][1])
        )
    ]

    warnings: list[str] = []
    for field, values in sorted(unmapped.items()):
        if values:
            preview = "、".join(sorted(values)[:8])
            extra = f" 等{len(values)}个" if len(values) > 8 else ""
            warnings.append(f"字段 {field} 仍有未映射值：{preview}{extra}")

    summary = CleaningSummary(
        total_rows=len(rows),
        success_rows=len(cleaned_rows),
        error_rows=0,
        mapped_cells=mapped_cells,
        changed_rows=changed_rows,
        unchanged_rows=max(0, len(cleaned_rows) - changed_rows),
        unmapped_values={key: sorted(vals) for key, vals in unmapped.items()},
        field_changes=field_changes,
        sample_diffs=sample_diffs,
        warnings=warnings,
    )
    return cleaned_rows, summary


def collect_field_distincts(rows: list[dict[str, Any]], fields: list[str] | None = None) -> dict[str, list[str]]:
    wanted = fields or list(MAPPABLE_FIELDS)
    buckets: dict[str, set[str]] = {field: set() for field in wanted}
    for row in rows:
        for field in wanted:
            value = row.get(field)
            if value is None or value == "":
                continue
            buckets[field].add(str(value).strip())
    return {field: sorted(values) for field, values in buckets.items() if values}
