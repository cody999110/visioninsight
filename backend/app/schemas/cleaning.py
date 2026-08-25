from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

CleaningField = Literal[
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
]


class DimensionMapping(BaseModel):
    field: CleaningField
    source: str = Field(min_length=1, max_length=200)
    target: str = Field(min_length=1, max_length=200)


class CleaningConfig(BaseModel):
    company: str
    mappings: list[DimensionMapping] = Field(default_factory=list)
    trim_text: bool = True
    normalize_dates: bool = True
    normalize_numbers: bool = True
    drop_empty_rows: bool = True
    updated_at: str | None = None


class CleaningConfigUpdate(BaseModel):
    mappings: list[DimensionMapping] = Field(default_factory=list)
    trim_text: bool = True
    normalize_dates: bool = True
    normalize_numbers: bool = True
    drop_empty_rows: bool = True


class FieldChangeSummary(BaseModel):
    field: str
    before: str
    after: str
    count: int


class RowFieldDiff(BaseModel):
    field: str
    before: Any = None
    after: Any = None


class RowDiff(BaseModel):
    row_no: int
    changes: list[RowFieldDiff] = Field(default_factory=list)


class CleaningSummary(BaseModel):
    total_rows: int = 0
    success_rows: int = 0
    error_rows: int = 0
    mapped_cells: int = 0
    changed_rows: int = 0
    unchanged_rows: int = 0
    unmapped_values: dict[str, list[str]] = Field(default_factory=dict)
    field_changes: list[FieldChangeSummary] = Field(default_factory=list)
    sample_diffs: list[RowDiff] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class CleaningPreviewResponse(BaseModel):
    dataset_id: str
    company: str
    domain: str
    status: str
    summary: CleaningSummary
    columns: list[dict[str, str]] = Field(default_factory=list)
    raw_preview: list[dict[str, Any]] = Field(default_factory=list)
    cleaned_preview: list[dict[str, Any]] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class CleaningDistincts(BaseModel):
    company: str
    fields: dict[str, list[str]] = Field(default_factory=dict)
