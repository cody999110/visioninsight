from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.dashboard import (
    BusinessLineRevenueResponse,
    ExpenseByDeptResponse,
    ExpenseStructureResponse,
    ExpenseTrendResponse,
    FundFlowResponse,
    FundKpiResponse,
    ProductMarginResponse,
    RegionSalesResponse,
    RevenueTrendResponse,
    TopCustomersResponse,
)
from app.services.dashboard_service import dashboard_service

router = APIRouter()


@router.get("/fund-kpi", response_model=FundKpiResponse)
def get_fund_kpi(dataset_id: str | None = Query(default=None)) -> FundKpiResponse:
    return dashboard_service.fund_kpi(dataset_id)


@router.get("/revenue-trend", response_model=RevenueTrendResponse)
def get_revenue_trend(
    years: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
) -> RevenueTrendResponse:
    year_list = [item.strip() for item in years.split(",")] if years else None
    return dashboard_service.revenue_trend(year_list, dataset_id)


@router.get("/top-customers", response_model=TopCustomersResponse)
def get_top_customers(
    limit: int = Query(default=5, ge=1, le=20),
    dataset_id: str | None = Query(default=None),
) -> TopCustomersResponse:
    return dashboard_service.top_customers(limit, dataset_id)


@router.get("/region-sales", response_model=RegionSalesResponse)
def get_region_sales(dataset_id: str | None = Query(default=None)) -> RegionSalesResponse:
    return dashboard_service.region_sales(dataset_id)


@router.get("/product-margin", response_model=ProductMarginResponse)
def get_product_margin(
    limit: int = Query(default=5, ge=1, le=20),
    dataset_id: str | None = Query(default=None),
) -> ProductMarginResponse:
    return dashboard_service.product_margin(limit, dataset_id)


@router.get("/expense-structure", response_model=ExpenseStructureResponse)
def get_expense_structure(
    year: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
) -> ExpenseStructureResponse:
    return dashboard_service.expense_structure(year, dataset_id)


@router.get("/business-line-revenue", response_model=BusinessLineRevenueResponse)
def get_business_line_revenue(
    year: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
) -> BusinessLineRevenueResponse:
    return dashboard_service.business_line_revenue(year, dataset_id)


@router.get("/expense-trend", response_model=ExpenseTrendResponse)
def get_expense_trend(
    year: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
) -> ExpenseTrendResponse:
    return dashboard_service.expense_trend(year, dataset_id)


@router.get("/expense-by-dept", response_model=ExpenseByDeptResponse)
def get_expense_by_dept(
    year: str | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
    dataset_id: str | None = Query(default=None),
) -> ExpenseByDeptResponse:
    return dashboard_service.expense_by_dept(year, limit, dataset_id)


@router.get("/fund-flow", response_model=FundFlowResponse)
def get_fund_flow(
    year: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
) -> FundFlowResponse:
    return dashboard_service.fund_flow(year, dataset_id)
