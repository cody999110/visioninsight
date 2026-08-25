from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings
from app.schemas.cleaning import CleaningConfig, CleaningConfigUpdate


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_config(company: str) -> CleaningConfig:
    return CleaningConfig(
        company=company,
        mappings=[],
        trim_text=True,
        normalize_dates=True,
        normalize_numbers=True,
        drop_empty_rows=True,
        updated_at=None,
    )


class CleaningConfigStore:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or settings.cleaning_config_dir
        self.root.mkdir(parents=True, exist_ok=True)

    def _slug(self, company: str) -> str:
        safe = "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in company).strip("._") or "company"
        digest = hashlib.sha256(company.encode("utf-8")).hexdigest()[:10]
        return f"{safe[:40]}_{digest}"

    def _path(self, company: str) -> Path:
        return self.root / f"{self._slug(company)}.json"

    def get(self, company: str) -> CleaningConfig:
        path = self._path(company)
        if not path.exists():
            return default_config(company)
        return CleaningConfig.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def save(self, company: str, update: CleaningConfigUpdate) -> CleaningConfig:
        record = CleaningConfig(
            company=company,
            mappings=update.mappings,
            trim_text=update.trim_text,
            normalize_dates=update.normalize_dates,
            normalize_numbers=update.normalize_numbers,
            drop_empty_rows=update.drop_empty_rows,
            updated_at=_utc_now(),
        )
        self._path(company).write_text(
            json.dumps(record.model_dump(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return record

    def delete(self, company: str) -> bool:
        path = self._path(company)
        if not path.exists():
            return False
        path.unlink()
        return True


cleaning_config_store = CleaningConfigStore()
