from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import settings


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


USABLE_STATUSES = {"validated", "active"}
LISTABLE_STATUSES = {"validated", "active", "pending_confirm"}


@dataclass
class DatasetRecord:
    id: str
    name: str
    company: str
    domain: str
    template_code: str
    status: str
    rows: list[dict[str, Any]] = field(default_factory=list)
    raw_rows: list[dict[str, Any]] = field(default_factory=list)
    pending_rows: list[dict[str, Any]] | None = None
    pending_raw_rows: list[dict[str, Any]] | None = None
    cleaning_summary: dict[str, Any] | None = None
    errors: list[str] = field(default_factory=list)
    row_count: int = 0
    error_count: int = 0
    data_as_of: str | None = None
    created_at: datetime = field(default_factory=_utc_now)
    activated_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "company": self.company,
            "domain": self.domain,
            "template_code": self.template_code,
            "status": self.status,
            "rows": self.rows,
            "raw_rows": self.raw_rows,
            "pending_rows": self.pending_rows,
            "pending_raw_rows": self.pending_raw_rows,
            "cleaning_summary": self.cleaning_summary,
            "errors": self.errors,
            "row_count": self.row_count,
            "error_count": self.error_count,
            "data_as_of": self.data_as_of,
            "created_at": _iso(self.created_at),
            "activated_at": _iso(self.activated_at),
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> DatasetRecord:
        return cls(
            id=payload["id"],
            name=payload["name"],
            company=payload.get("company") or payload["name"],
            domain=payload["domain"],
            template_code=payload["template_code"],
            status=payload["status"],
            rows=payload.get("rows", []),
            raw_rows=payload.get("raw_rows", []),
            pending_rows=payload.get("pending_rows"),
            pending_raw_rows=payload.get("pending_raw_rows"),
            cleaning_summary=payload.get("cleaning_summary"),
            errors=payload.get("errors", []),
            row_count=payload.get("row_count", 0),
            error_count=payload.get("error_count", 0),
            data_as_of=payload.get("data_as_of"),
            created_at=_parse_dt(payload.get("created_at")) or _utc_now(),
            activated_at=_parse_dt(payload.get("activated_at")),
        )


class DatasetStore:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or settings.storage_dir
        self.root.mkdir(parents=True, exist_ok=True)
        self._active_file = self.root / "active.json"

    def _path(self, dataset_id: str) -> Path:
        return self.root / f"{dataset_id}.json"

    def create(self, name: str, company: str, domain: str, template_code: str) -> DatasetRecord:
        record = DatasetRecord(
            id=str(uuid.uuid4()),
            name=name,
            company=company,
            domain=domain,
            template_code=template_code,
            status="draft",
        )
        self.save(record)
        return record

    def save(self, record: DatasetRecord) -> None:
        self._path(record.id).write_text(
            json.dumps(record.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get(self, dataset_id: str) -> DatasetRecord | None:
        path = self._path(dataset_id)
        if not path.exists():
            return None
        return DatasetRecord.from_dict(json.loads(path.read_text(encoding="utf-8")))

    def list_all(self, domain: str | None = None) -> list[DatasetRecord]:
        records: list[DatasetRecord] = []
        for path in sorted(self.root.glob("*.json")):
            if path.name == "active.json":
                continue
            record = DatasetRecord.from_dict(json.loads(path.read_text(encoding="utf-8")))
            if domain is None or record.domain == domain:
                records.append(record)
        records.sort(key=lambda item: item.created_at, reverse=True)
        return records

    def list_companies(self) -> list[dict[str, Any]]:
        """Group listable datasets by company; keep newest dataset per (company, domain).

        pending_confirm is included only when previously committed rows still exist,
        so a re-upload waiting for confirm does not make the company disappear.
        """
        grouped: dict[str, dict[str, Any]] = {}
        for record in self.list_all():  # newest first
            if record.status not in LISTABLE_STATUSES:
                continue
            if record.status == "pending_confirm" and not record.rows:
                continue
            if record.status in USABLE_STATUSES and not record.rows:
                continue
            company = grouped.setdefault(
                record.company,
                {"name": record.company, "datasets": {}, "data_as_of": None},
            )
            if record.domain not in company["datasets"]:
                company["datasets"][record.domain] = record.id
                if record.data_as_of and (
                    company["data_as_of"] is None or record.data_as_of > company["data_as_of"]
                ):
                    company["data_as_of"] = record.data_as_of
        return list(grouped.values())

    def get_usable(self, dataset_id: str, domain: str) -> DatasetRecord | None:
        record = self.get(dataset_id)
        if record is None or record.domain != domain:
            return None
        if record.status not in USABLE_STATUSES or not record.rows:
            return None
        return record

    def delete(self, dataset_id: str) -> bool:
        path = self._path(dataset_id)
        if not path.exists():
            return False
        path.unlink()
        active = self.get_active_map()
        changed = False
        for domain, active_id in list(active.items()):
            if active_id == dataset_id:
                del active[domain]
                changed = True
        if changed:
            self._write_active_map(active)
        return True

    def get_active_map(self) -> dict[str, str]:
        if not self._active_file.exists():
            return {}
        return json.loads(self._active_file.read_text(encoding="utf-8"))

    def get_active(self, domain: str) -> DatasetRecord | None:
        active_id = self.get_active_map().get(domain)
        if not active_id:
            return None
        record = self.get(active_id)
        if record is None or record.status != "active":
            return None
        return record

    def activate(self, dataset_id: str) -> DatasetRecord:
        record = self.get(dataset_id)
        if record is None:
            raise KeyError(dataset_id)
        if record.status not in {"validated", "archived"}:
            raise ValueError("Dataset must be validated before activation")

        active = self.get_active_map()
        previous_id = active.get(record.domain)
        if previous_id and previous_id != dataset_id:
            previous = self.get(previous_id)
            if previous is not None:
                previous.status = "archived"
                self.save(previous)

        record.status = "active"
        record.activated_at = _utc_now()
        self.save(record)
        active[record.domain] = dataset_id
        self._write_active_map(active)
        return record

    def _write_active_map(self, active: dict[str, str]) -> None:
        self._active_file.write_text(json.dumps(active, ensure_ascii=False, indent=2), encoding="utf-8")


dataset_store = DatasetStore()
