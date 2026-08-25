from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.dataset_store import dataset_store
from app.services.mgmt_config_store import mgmt_config_store

client = TestClient(app)
SAMPLES = Path(__file__).resolve().parents[1] / "samples"
COMPANY = "管理报表测试公司"


def _upload(domain: str, template_code: str, sample_name: str) -> str:
    create_resp = client.post(
        "/api/v1/import/datasets",
        json={
            "name": f"{COMPANY} · {domain}",
            "company": COMPANY,
            "domain": domain,
            "template_code": template_code,
        },
    )
    assert create_resp.status_code == 200
    dataset_id = create_resp.json()["id"]
    csv_content = (SAMPLES / sample_name).read_bytes()
    upload_resp = client.post(
        f"/api/v1/import/datasets/{dataset_id}/upload?auto_confirm=true",
        files={"file": (sample_name, BytesIO(csv_content), "text/csv")},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["can_activate"] is True
    return dataset_id


class _Approx:
    def __init__(self, value: float, rel: float = 1e-3) -> None:
        self.value = value
        self.rel = rel

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, (int, float)):
            return False
        return abs(float(other) - self.value) <= max(1e-6, abs(self.value) * self.rel)


def test_management_config_and_report_aggregation() -> None:
    revenue_id = _upload("revenue", "tpl_revenue_cost_detail", "sample_revenue.csv")
    expense_id = _upload("expense", "tpl_expense_detail", "sample_expense.csv")
    try:
        default_resp = client.get("/api/v1/management/config", params={"company": COMPANY})
        assert default_resp.status_code == 200
        assert any(item["catch_all"] for item in default_resp.json()["business_lines"])

        save_resp = client.put(
            "/api/v1/management/config",
            params={"company": COMPANY},
            json={
                "business_lines": [
                    {"id": "tires", "name": "轮胎", "aliases": ["智能安防"], "catch_all": False},
                    {"id": "oil", "name": "机油", "aliases": ["智能驾驶"], "catch_all": False},
                    {"id": "other", "name": "其他", "aliases": [], "catch_all": True},
                ],
                "expense_groups": [
                    {"id": "labor", "name": "人力成本", "subjects": ["差旅费"]},
                    {"id": "market", "name": "市场费用", "subjects": ["市场推广费"]},
                ],
                "allocation_rules": [
                    {
                        "id": "admin",
                        "name": "管理费用分摊",
                        "match_field": "expense_category",
                        "match_values": ["管理费用"],
                        "method": "ratio",
                        "ratios": {"tires": 50, "oil": 50, "other": 0},
                    },
                    {
                        "id": "rd",
                        "name": "研发费用按收入分摊",
                        "match_field": "expense_category",
                        "match_values": ["研发费用"],
                        "method": "revenue_share",
                        "ratios": {},
                    },
                    {
                        "id": "sales",
                        "name": "销售费用归机油",
                        "match_field": "expense_category",
                        "match_values": ["销售费用"],
                        "method": "ratio",
                        "ratios": {"tires": 0, "oil": 100, "other": 0},
                    },
                ],
            },
        )
        assert save_resp.status_code == 200

        distincts = client.get("/api/v1/management/distincts", params={"company": COMPANY})
        assert distincts.status_code == 200
        payload = distincts.json()
        assert "智能安防" in payload["mapped_business_lines"]
        assert "AIoT" in payload["unmapped_business_lines"]
        assert "差旅费" in payload["expense_subjects"]

        report_resp = client.get("/api/v1/management/report", params={"company": COMPANY, "year": 2025})
        assert report_resp.status_code == 200
        report = report_resp.json()
        assert report["is_live_data"] is True
        assert report["year"] == 2025
        assert report["kpis"]["revenue"] == 322.0

        by_id = {row["line_id"]: row for row in report["lines"]}
        assert by_id["tires"]["revenue"]["year"] == 182.8
        assert by_id["oil"]["revenue"]["year"] == 57.6
        assert by_id["other"]["revenue"]["year"] == 81.6
        assert by_id["tires"]["revenue"]["h1"] == 182.8
        assert by_id["tires"]["revenue"]["h2"] == 0

        assert by_id["tires"]["expense"]["year"] == _Approx(21 + 12.5 * 182.8 / 322)
        assert by_id["oil"]["expense"]["year"] == _Approx(21 + 8.6 + 12.5 * 57.6 / 322)
        assert by_id["other"]["expense"]["year"] == _Approx(12.5 * 81.6 / 322)
        assert by_id["tires"]["expense_groups"]["labor"]["year"] == _Approx(12.5 * 182.8 / 322)
        assert by_id["oil"]["expense_groups"]["market"]["year"] == 8.6
        assert by_id["total"]["kind"] == "total"
        assert report["kpis"]["unallocated_expense"] == 0
    finally:
        dataset_store.delete(revenue_id)
        dataset_store.delete(expense_id)
        mgmt_config_store.delete(COMPANY)


def test_management_rejects_two_catch_all() -> None:
    response = client.put(
        "/api/v1/management/config",
        params={"company": "非法配置公司"},
        json={
            "business_lines": [
                {"id": "a", "name": "A", "aliases": [], "catch_all": True},
                {"id": "b", "name": "B", "aliases": [], "catch_all": True},
            ],
            "expense_groups": [],
            "allocation_rules": [],
        },
    )
    assert response.status_code == 422
