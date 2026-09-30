from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.cleaning_config_store import cleaning_config_store
from app.services.dataset_store import dataset_store

client = TestClient(app)
SAMPLES = Path(__file__).resolve().parents[1] / "samples"
COMPANY = "清洗测试公司"


def _create_and_upload(*, auto_confirm: bool = False) -> str:
    create_resp = client.post(
        "/api/v1/import/datasets",
        json={
            "name": f"{COMPANY} · 收入成本",
            "company": COMPANY,
            "domain": "revenue",
            "template_code": "tpl_revenue_cost_detail",
        },
    )
    assert create_resp.status_code == 200
    dataset_id = create_resp.json()["id"]
    csv_content = (SAMPLES / "sample_revenue.csv").read_bytes()
    query = "auto_confirm=true" if auto_confirm else "auto_confirm=false"
    upload_resp = client.post(
        f"/api/v1/import/datasets/{dataset_id}/upload?{query}",
        files={"file": ("sample_revenue.csv", BytesIO(csv_content), "text/csv")},
    )
    assert upload_resp.status_code == 200, upload_resp.text
    return dataset_id


def test_cleaning_config_crud_and_mapping_preview() -> None:
    put_resp = client.put(
        f"/api/v1/cleaning/config?company={COMPANY}",
        json={
            "mappings": [
                {"field": "entity_name", "source": "集团", "target": "集团总部"},
                {"field": "business_line", "source": "智能驾驶", "target": "智驾业务"},
            ],
            "trim_text": True,
            "normalize_dates": True,
            "normalize_numbers": True,
            "drop_empty_rows": True,
        },
    )
    assert put_resp.status_code == 200
    assert len(put_resp.json()["mappings"]) == 2

    get_resp = client.get(f"/api/v1/cleaning/config?company={COMPANY}")
    assert get_resp.status_code == 200
    assert get_resp.json()["mappings"][0]["target"] == "集团总部"

    dataset_id = _create_and_upload(auto_confirm=False)
    try:
        upload_detail = client.get(f"/api/v1/import/datasets/{dataset_id}")
        assert upload_detail.status_code == 200
        assert upload_detail.json()["status"] == "pending_confirm"

        preview = client.get(f"/api/v1/import/datasets/{dataset_id}/cleaning-preview")
        assert preview.status_code == 200
        body = preview.json()
        assert body["status"] == "pending_confirm"
        assert body["summary"]["mapped_cells"] >= 1
        assert any(
            row.get("entity_name") == "集团总部" for row in body["cleaned_preview"]
        )
        assert any(row.get("entity_name") == "集团" for row in body["raw_preview"])

        confirm = client.post(f"/api/v1/import/datasets/{dataset_id}/confirm")
        assert confirm.status_code == 200
        assert confirm.json()["status"] == "validated"

        detail = client.get(f"/api/v1/import/datasets/{dataset_id}", params={"preview_limit": 20})
        assert detail.status_code == 200
        rows = detail.json()["preview_rows"]
        assert any(row.get("entity_name") == "集团总部" for row in rows)
        assert any(row.get("business_line") == "智驾业务" for row in rows)

        distincts = client.get(f"/api/v1/cleaning/distincts?company={COMPANY}")
        assert distincts.status_code == 200
        fields = distincts.json()["fields"]
        assert "entity_name" in fields
        assert "集团" in fields["entity_name"] or "集团总部" in fields["entity_name"]
    finally:
        dataset_store.delete(dataset_id)
        cleaning_config_store.delete(COMPANY)


def test_reapply_cleaning_after_config_change() -> None:
    put_resp = client.put(
        f"/api/v1/cleaning/config?company={COMPANY}",
        json={
            "mappings": [
                {"field": "region", "source": "华东", "target": "华东区"},
            ],
        },
    )
    assert put_resp.status_code == 200

    dataset_id = _create_and_upload(auto_confirm=True)
    try:
        detail = client.get(f"/api/v1/import/datasets/{dataset_id}", params={"preview_limit": 50})
        assert any(row.get("region") == "华东区" for row in detail.json()["preview_rows"])

        client.put(
            f"/api/v1/cleaning/config?company={COMPANY}",
            json={
                "mappings": [
                    {"field": "region", "source": "华东", "target": "华东大区"},
                ],
            },
        )
        reapply = client.post(
            f"/api/v1/import/datasets/{dataset_id}/reapply-cleaning?auto_confirm=true"
        )
        assert reapply.status_code == 200
        assert reapply.json()["can_activate"] is True

        detail2 = client.get(f"/api/v1/import/datasets/{dataset_id}", params={"preview_limit": 50})
        assert any(row.get("region") == "华东大区" for row in detail2.json()["preview_rows"])
    finally:
        dataset_store.delete(dataset_id)
        cleaning_config_store.delete(COMPANY)
