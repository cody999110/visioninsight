from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.schemas.dashboard import (
    ExpenseStructureItem,
    ExpenseStructureResponse,
    FundKpiResponse,
    ProductMarginItem,
    ProductMarginResponse,
    RegionSalesResponse,
    RevenueTrendPoint,
    RevenueTrendResponse,
    TopCustomerItem,
    TopCustomersResponse,
)
from app.services.dataset_store import DatasetRecord, dataset_store

EXPENSE_COLORS = {
    "研发费用": "hsl(262, 60%, 55%)",
    "销售费用": "hsl(195, 85%, 50%)",
    "管理费用": "hsl(150, 60%, 50%)",
    "财务费用": "hsl(35, 90%, 55%)",
    "制造费用": "hsl(340, 70%, 55%)",
    "人力成本": "hsl(220, 70%, 50%)",
    "折旧摊销": "hsl(340, 70%, 55%)",
    "其他费用": "hsl(220, 40%, 50%)",
}

PRODUCT_COLORS = [
    "hsl(262, 60%, 55%)",
    "hsl(195, 85%, 50%)",
    "hsl(150, 60%, 50%)",
    "hsl(35, 90%, 55%)",
    "hsl(340, 70%, 55%)",
]


def _resolve_dataset(domain: str, dataset_id: str | None) -> tuple[DatasetRecord | None, str]:
    if dataset_id:
        record = dataset_store.get_usable(dataset_id, domain)
        if record:
            return record, "dataset"
        return None, "dataset"
    return None, "official"


def _month_label(month: int) -> str:
    return f"{month}月"


class DashboardService:
    def fund_kpi(self, dataset_id: str | None = None) -> FundKpiResponse:
        record, source_mode = _resolve_dataset("fund", dataset_id)
        if not record or not record.rows:
            return FundKpiResponse(
                total=0,
                bank_deposit=0,
                cash_on_hand=0,
                short_term_investment=0,
                change=0,
                source_mode=source_mode,
                dataset_id=record.id if record else dataset_id,
                is_live_data=False,
            )

        latest_balances = [float(row.get("balance_after") or 0) for row in record.rows if row.get("balance_after")]
        total = max(latest_balances) if latest_balances else sum(float(row.get("income_amount") or 0) for row in record.rows)
        income = sum(float(row.get("income_amount") or 0) for row in record.rows)
        expense = sum(float(row.get("expense_amount") or 0) for row in record.rows)
        change = round(((income - expense) / total) * 100, 1) if total else 0

        return FundKpiResponse(
            total=total,
            bank_deposit=total * 0.62,
            cash_on_hand=total * 0.12,
            short_term_investment=total * 0.26,
            change=change,
            source_mode="dataset",
            dataset_id=record.id,
            is_live_data=True,
        )

    def revenue_trend(self, years: list[str] | None = None, dataset_id: str | None = None) -> RevenueTrendResponse:
        record, source_mode = _resolve_dataset("revenue", dataset_id)
        if not record or not record.rows:
            return RevenueTrendResponse(years={}, source_mode=source_mode, dataset_id=dataset_id, is_live_data=False)

        buckets: dict[str, dict[int, dict[str, float]]] = defaultdict(lambda: defaultdict(lambda: {"revenue": 0.0, "cost": 0.0}))
        for row in record.rows:
            date = str(row.get("trans_date", ""))
            if len(date) < 7:
                continue
            year = date[:4]
            try:
                month = int(date[5:7])
            except ValueError:
                continue
            revenue = float(row.get("revenue") or 0) / 10000
            cost = float(row.get("cost") or 0) / 10000
            buckets[year][month]["revenue"] += revenue
            buckets[year][month]["cost"] += cost

        selected_years = years or sorted(buckets.keys())
        result: dict[str, list[RevenueTrendPoint]] = {}
        for year in selected_years:
            points: list[RevenueTrendPoint] = []
            for month in range(1, 13):
                values = buckets.get(year, {}).get(month, {"revenue": 0.0, "cost": 0.0})
                revenue = round(values["revenue"], 2)
                gross_profit = round(values["revenue"] - values["cost"], 2)
                gross_margin = round((gross_profit / revenue) * 100, 1) if revenue else 0
                points.append(
                    RevenueTrendPoint(
                        month=_month_label(month),
                        revenue=revenue,
                        gross_profit=gross_profit,
                        gross_margin=gross_margin,
                    )
                )
            result[year] = points

        return RevenueTrendResponse(
            years=result,
            source_mode="dataset",
            dataset_id=record.id,
            is_live_data=True,
        )

    def top_customers(self, limit: int = 5, dataset_id: str | None = None) -> TopCustomersResponse:
        record, source_mode = _resolve_dataset("revenue", dataset_id)
        if not record or not record.rows:
            return TopCustomersResponse(items=[], source_mode=source_mode, dataset_id=dataset_id, is_live_data=False)

        totals: dict[str, float] = defaultdict(float)
        monthly: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
        for row in record.rows:
            name = str(row.get("customer_name") or "未知客户")
            revenue = float(row.get("revenue") or 0) / 10000
            totals[name] += revenue
            month_key = str(row.get("trans_date", ""))[:7]
            if len(month_key) == 7:
                monthly[name][month_key] += revenue

        grand_total = sum(totals.values()) or 1
        items = sorted(totals.items(), key=lambda item: item[1], reverse=True)[:limit]
        result: list[TopCustomerItem] = []
        for name, value in items:
            months = sorted(monthly[name].keys())
            trend: float | None = None
            if len(months) >= 2:
                last = monthly[name][months[-1]]
                prev = monthly[name][months[-2]]
                if prev:
                    trend = round(((last - prev) / prev) * 100, 1)
            result.append(
                TopCustomerItem(
                    name=name,
                    sales=round(value, 2),
                    percentage=round((value / grand_total) * 100, 1),
                    trend=trend,
                )
            )
        return TopCustomersResponse(
            items=result,
            source_mode="dataset",
            dataset_id=record.id,
            is_live_data=True,
        )

    def region_sales(self, dataset_id: str | None = None) -> RegionSalesResponse:
        record, source_mode = _resolve_dataset("revenue", dataset_id)
        if not record or not record.rows:
            return RegionSalesResponse(regions={}, source_mode=source_mode, dataset_id=dataset_id, is_live_data=False)

        totals: dict[str, float] = defaultdict(float)
        for row in record.rows:
            province = str(row.get("province") or row.get("region") or "未知")
            totals[province] += float(row.get("revenue") or 0) / 10000

        return RegionSalesResponse(
            regions={key: round(value, 2) for key, value in totals.items()},
            source_mode="dataset",
            dataset_id=record.id,
            is_live_data=True,
        )

    def product_margin(self, limit: int = 5, dataset_id: str | None = None) -> ProductMarginResponse:
        record, source_mode = _resolve_dataset("revenue", dataset_id)
        if not record or not record.rows:
            return ProductMarginResponse(items=[], source_mode=source_mode, dataset_id=dataset_id, is_live_data=False)

        totals: dict[str, dict[str, float]] = defaultdict(lambda: {"revenue": 0.0, "cost": 0.0})
        for row in record.rows:
            name = str(row.get("product_name") or "未知产品")
            totals[name]["revenue"] += float(row.get("revenue") or 0) / 10000
            totals[name]["cost"] += float(row.get("cost") or 0) / 10000

        ranked = sorted(totals.items(), key=lambda item: item[1]["revenue"], reverse=True)[:limit]
        items: list[ProductMarginItem] = []
        for index, (name, values) in enumerate(ranked):
            revenue = values["revenue"]
            margin = round(((revenue - values["cost"]) / revenue) * 100, 1) if revenue else 0
            items.append(
                ProductMarginItem(
                    name=name,
                    margin=margin,
                    revenue=round(revenue, 2),
                    color=PRODUCT_COLORS[index % len(PRODUCT_COLORS)],
                )
            )

        return ProductMarginResponse(
            items=items,
            source_mode="dataset",
            dataset_id=record.id,
            is_live_data=True,
        )

    def expense_structure(self, year: str | None = None, dataset_id: str | None = None) -> ExpenseStructureResponse:
        record, source_mode = _resolve_dataset("expense", dataset_id)
        if not record or not record.rows:
            return ExpenseStructureResponse(
                year=year or str(datetime_now_year()),
                items=[],
                source_mode=source_mode,
                dataset_id=dataset_id,
                is_live_data=False,
            )

        selected_year = year or str(datetime_now_year())
        totals: dict[str, float] = defaultdict(float)
        for row in record.rows:
            date = str(row.get("trans_date", ""))
            if date and not date.startswith(selected_year):
                continue
            category = str(row.get("expense_category") or "其他费用")
            totals[category] += float(row.get("amount") or 0) / 10000

        grand_total = sum(totals.values()) or 1
        items = sorted(totals.items(), key=lambda item: item[1], reverse=True)
        return ExpenseStructureResponse(
            year=selected_year,
            items=[
                ExpenseStructureItem(
                    category=category,
                    amount=round(amount, 2),
                    percentage=round((amount / grand_total) * 100, 1),
                    color=EXPENSE_COLORS.get(category, "hsl(220, 40%, 50%)"),
                )
                for category, amount in items
            ],
            source_mode="dataset",
            dataset_id=record.id,
            is_live_data=True,
        )


def datetime_now_year() -> int:
    from datetime import datetime

    return datetime.now().year


dashboard_service = DashboardService()
