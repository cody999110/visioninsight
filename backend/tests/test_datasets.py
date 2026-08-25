from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.dataset_store import dataset_store

client = TestClient(app)
SAMPLES = Path(__file__).resolve().parents[1] / "samples"


def test_create_upload_and_company_view_revenue() -> None:
    create_resp = client.post(
        "/api/v1/import/datasets",
        json={
            "name": "测试收入 · 收入成本",
            "company": "测试公司A",
            "domain": "revenue",
            "template_code": "tpl_revenue_cost_detail",
        },
    )
    assert create_resp.status_code == 200
    dataset_id = create_resp.json()["id"]

    csv_content = (SAMPLES / "sample_revenue.csv").read_bytes()
    upload_resp = client.post(
        f"/api/v1/import/datasets/{dataset_id}/upload?auto_confirm=true",
        files={"file": ("sample_revenue.csv", BytesIO(csv_content), "text/csv")},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["can_activate"] is True

    companies_resp = client.get("/api/v1/import/datasets/companies")
    assert companies_resp.status_code == 200
    companies = companies_resp.json()["items"]
    target = next((c for c in companies if c["name"] == "测试公司A"), None)
    assert target is not None
    assert target["datasets"]["revenue"] == dataset_id

    # Without dataset_id the dashboard stays on demo (mock) data.
    demo_resp = client.get("/api/v1/dashboard/top-customers")
    assert demo_resp.status_code == 200
    assert demo_resp.json()["is_live_data"] is False

    # With the dataset_id the dashboard returns the uploaded company's data.
    live_resp = client.get(f"/api/v1/dashboard/top-customers?dataset_id={dataset_id}")
    assert live_resp.status_code == 200
    payload = live_resp.json()
    assert payload["is_live_data"] is True
    assert len(payload["items"]) > 0

    dataset_store.delete(dataset_id)


def test_download_and_reupload_dataset() -> None:
    create_resp = client.post(
        "/api/v1/import/datasets",
        json={
            "name": "测试收入 · 收入成本",
            "company": "测试公司B",
            "domain": "revenue",
            "template_code": "tpl_revenue_cost_detail",
        },
    )
    assert create_resp.status_code == 200
    dataset_id = create_resp.json()["id"]
    assert create_resp.json()["columns"][0]["key"] == "trans_date"

    csv_content = (SAMPLES / "sample_revenue.csv").read_bytes()
    upload_resp = client.post(
        f"/api/v1/import/datasets/{dataset_id}/upload?auto_confirm=true",
        files={"file": ("sample_revenue.csv", BytesIO(csv_content), "text/csv")},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["can_activate"] is True

    detail_resp = client.get(f"/api/v1/import/datasets/{dataset_id}", params={"preview_limit": 50})
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["row_count"] > 0
    assert len(detail["preview_rows"]) > 0
    assert detail["columns"][1]["label"] == "主体"

    download_resp = client.get(f"/api/v1/import/datasets/{dataset_id}/download")
    assert download_resp.status_code == 200
    assert "text/csv" in download_resp.headers["content-type"]
    body = download_resp.content.decode("utf-8-sig")
    lines = [line for line in body.splitlines() if line.strip()]
    assert lines[0].startswith("trans_date")
    assert "日期" in lines[1]
    assert any("豪威集团" in line for line in lines[2:])

    edited = body.replace("豪威集团", "豪威集团-修订", 1).encode("utf-8-sig")
    reupload_resp = client.post(
        f"/api/v1/import/datasets/{dataset_id}/upload?auto_confirm=true",
        files={"file": ("edited.csv", BytesIO(edited), "text/csv")},
    )
    assert reupload_resp.status_code == 200
    assert reupload_resp.json()["can_activate"] is True

    again = client.get(f"/api/v1/import/datasets/{dataset_id}/download")
    assert "豪威集团-修订" in again.content.decode("utf-8-sig")

    dataset_store.delete(dataset_id)


def test_download_missing_dataset() -> None:
    response = client.get("/api/v1/import/datasets/not-a-real-id/download")
    assert response.status_code == 404


def test_campaign_dimensions_are_not_globally_enumerated() -> None:
    """Each campaign owns its vocabulary; import must not reject company-specific labels."""
    expense_csv = (
        "trans_date,entity_name,department_name,sales_person,customer_name,project_name,"
        "expense_category,expense_subject,cost_center,amount,currency,doc_no,approval_status,summary,supplier_name\n"
        "date,entity,dept,sales,customer,project,category,subject,cc,amount,ccy,doc,status,summary,supplier\n"
        "2025-03-01,ACo,BackOffice,-,-,-,LaborCost,Travel,CC-1,420000,RMB,BX-A-001,Paid,rent,-\n"
    ).encode("utf-8-sig")
    revenue_csv = (
        "trans_date,entity_name,business_line,customer_code,customer_name,sales_person,sales_channel,"
        "product_code,product_name,spec,model,region,province,revenue_type,quantity,unit_price,revenue,cost,doc_no,currency\n"
        "date,entity,line,code,customer,sales,channel,pcode,pname,spec,model,region,province,type,qty,price,rev,cost,doc,ccy\n"
        "2025-01-15,ACo,Tires,C-001,CustA,Ming,Direct,P-001,TireA,-,-,East,Guangdong,Goods,1000,850,850000,620000,SO-A-001,RMB\n"
    ).encode("utf-8-sig")
    fund_csv = (
        "trans_date,entity_name,bank_account,bank_name,counterparty,income_amount,expense_amount,"
        "balance_after,summary,trans_type,business_source,currency,doc_no\n"
        "date,entity,account,bank,cp,in,out,bal,summary,type,source,ccy,doc\n"
        "2025-06-15,ACo,6222,LocalBank,CustA,500000,0,12500000,payment,transfer,OnlineBank,RMB,FD-A-001\n"
    ).encode("utf-8-sig")

    cases = [
        ("expense", "tpl_expense_detail", expense_csv, "expense.csv"),
        ("revenue", "tpl_revenue_cost_detail", revenue_csv, "revenue.csv"),
        ("fund", "tpl_fund_transaction", fund_csv, "fund.csv"),
    ]
    created: list[str] = []
    try:
        for domain, template_code, content, filename in cases:
            create_resp = client.post(
                "/api/v1/import/datasets",
                json={
                    "name": f"ACo · {domain}",
                    "company": "ACo",
                    "domain": domain,
                    "template_code": template_code,
                },
            )
            assert create_resp.status_code == 200, create_resp.text
            dataset_id = create_resp.json()["id"]
            created.append(dataset_id)
            upload_resp = client.post(
                f"/api/v1/import/datasets/{dataset_id}/upload?auto_confirm=true",
                files={"file": (filename, BytesIO(content), "text/csv")},
            )
            assert upload_resp.status_code == 200, upload_resp.text
            payload = upload_resp.json()
            assert payload["can_activate"] is True, payload
            assert payload["error_rows"] == 0, payload
            assert payload["success_rows"] == 1
    finally:
        for dataset_id in created:
            dataset_store.delete(dataset_id)


def test_failed_reupload_keeps_previous_company_data() -> None:
    create_resp = client.post(
        "/api/v1/import/datasets",
        json={
            "name": "保留测试 · 收入成本",
            "company": "保留测试公司",
            "domain": "revenue",
            "template_code": "tpl_revenue_cost_detail",
        },
    )
    assert create_resp.status_code == 200
    dataset_id = create_resp.json()["id"]
    try:
        csv_content = (SAMPLES / "sample_revenue.csv").read_bytes()
        ok = client.post(
            f"/api/v1/import/datasets/{dataset_id}/upload?auto_confirm=true",
            files={"file": ("sample_revenue.csv", BytesIO(csv_content), "text/csv")},
        )
        assert ok.status_code == 200
        assert ok.json()["can_activate"] is True

        companies = client.get("/api/v1/import/datasets/companies").json()["items"]
        assert any(item["name"] == "保留测试公司" for item in companies)

        expense = (SAMPLES / "sample_expense.csv").read_bytes()
        bad = client.post(
            f"/api/v1/import/datasets/{dataset_id}/upload",
            files={"file": ("sample_expense.csv", BytesIO(expense), "text/csv")},
        )
        assert bad.status_code == 400
        assert "缺少" in bad.json()["detail"]

        detail = client.get(f"/api/v1/import/datasets/{dataset_id}").json()
        assert detail["status"] == "validated"
        assert detail["row_count"] > 0

        companies2 = client.get("/api/v1/import/datasets/companies").json()["items"]
        assert any(item["name"] == "保留测试公司" for item in companies2)
    finally:
        dataset_store.delete(dataset_id)
