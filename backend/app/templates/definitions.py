from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Domain = Literal["expense", "revenue", "fund", "dashboard"]
ColumnType = Literal["string", "date", "month", "number", "enum"]


@dataclass(frozen=True)
class TemplateColumn:
    key: str
    label: str
    required: bool
    column_type: ColumnType
    description: str = ""
    enum_values: tuple[str, ...] = field(default_factory=tuple)
    example: str = ""


@dataclass(frozen=True)
class ImportTemplateDefinition:
    code: str
    name: str
    domain: Domain
    version: str
    description: str
    fact_table: str
    columns: tuple[TemplateColumn, ...]


def _col(
    key: str,
    label: str,
    *,
    required: bool = False,
    column_type: ColumnType = "string",
    description: str = "",
    enum_values: tuple[str, ...] = (),
    example: str = "",
) -> TemplateColumn:
    return TemplateColumn(
        key=key,
        label=label,
        required=required,
        column_type=column_type,
        description=description,
        enum_values=enum_values,
        example=example,
    )


# Shown in template 字段说明 as 参考取值 only. Campaign uploads are not limited to these.
EXPENSE_CATEGORIES = ("销售费用", "管理费用", "研发费用", "制造费用")
APPROVAL_STATUSES = ("已审批", "审批中", "已驳回", "待提交")
CURRENCIES = ("CNY", "USD", "EUR", "HKD", "JPY")
REVENUE_TYPES = ("收入", "成本")
BUSINESS_SOURCES = ("ERP系统", "OA报销", "资金管理系统", "银企直联", "手工录入", "CBS")


TPL_EXPENSE_DETAIL = ImportTemplateDefinition(
    code="tpl_expense_detail",
    name="费用明细导入模板",
    domain="expense",
    version="1.0.0",
    description="费用 BI 与看板运营费用结构的数据导入模板",
    fact_table="fact_expense",
    columns=(
        _col("trans_date", "发生日期", required=True, column_type="date", description="YYYY-MM-DD", example="2025-06-15"),
        _col("entity_name", "主体", required=True, description="法人主体或运营主体，按实际上传填写", example="A公司"),
        _col("department_name", "部门", required=True, example="研发一部"),
        _col("sales_person", "销售人员", example="张伟"),
        _col("customer_name", "客户", example="比亚迪"),
        _col("project_name", "项目", example="NovaDrive量产"),
        _col("expense_category", "费用大类", required=True, description="按本公司口径填写", enum_values=EXPENSE_CATEGORIES, example="研发费用"),
        _col("expense_subject", "费用科目", required=True, example="差旅费"),
        _col("cost_center", "成本中心", example="CC-100"),
        _col("amount", "金额", required=True, column_type="number", description="单位：元", example="12500"),
        _col("currency", "币种", description="如 CNY / USD", enum_values=CURRENCIES, example="CNY"),
        _col("doc_no", "单据号", required=True, example="BX202500123"),
        _col("approval_status", "审批状态", description="如 已审批 / 审批中", enum_values=APPROVAL_STATUSES, example="已审批"),
        _col("summary", "摘要", example="客户拜访"),
        _col("supplier_name", "供应商", example="德勤咨询"),
    ),
)

TPL_REVENUE_COST_DETAIL = ImportTemplateDefinition(
    code="tpl_revenue_cost_detail",
    name="收入成本明细导入模板",
    domain="revenue",
    version="1.0.0",
    description="收入成本 BI 与看板收入/客户/产品/区域图表的数据导入模板",
    fact_table="fact_revenue_cost",
    columns=(
        _col("trans_date", "日期", required=True, column_type="date", example="2025-06-15"),
        _col("entity_name", "主体", required=True, description="法人主体或运营主体，按实际上传填写", example="A公司"),
        _col("business_line", "业务线", description="与管理报表配置中的业务线对应", example="智能驾驶"),
        _col("customer_code", "客户编号", example="C-001"),
        _col("customer_name", "客户名称", required=True, example="比亚迪"),
        _col("sales_person", "销售人员", example="张明"),
        _col("sales_channel", "销售渠道", example="直销"),
        _col("product_code", "产品编号", example="P-001"),
        _col("product_name", "品名", required=True, example="NovaDrive-H800"),
        _col("spec", "规格", example="BGA/7nm/32TOPS"),
        _col("model", "汇报型号", example="NovaDrive-H800"),
        _col("region", "销售区域", example="华东"),
        _col("province", "省份", example="广东"),
        _col("revenue_type", "类型", description="如 收入 / 成本", enum_values=REVENUE_TYPES, example="收入"),
        _col("quantity", "数量", column_type="number", example="1000"),
        _col("unit_price", "单价", column_type="number", description="单位：元", example="85.5"),
        _col("revenue", "收入", column_type="number", description="单位：元", example="85500"),
        _col("cost", "成本", column_type="number", description="单位：元", example="62000"),
        _col("doc_no", "单据号", required=True, example="SO-2025001"),
        _col("currency", "币种", description="如 CNY / USD", enum_values=CURRENCIES, example="CNY"),
    ),
)

TPL_FUND_TRANSACTION = ImportTemplateDefinition(
    code="tpl_fund_transaction",
    name="资金流水导入模板",
    domain="fund",
    version="1.0.0",
    description="资金 BI 与看板 KPI 的银行流水导入模板",
    fact_table="fact_fund_transaction",
    columns=(
        _col("trans_date", "交易日期", required=True, column_type="date", example="2025-06-15"),
        _col("entity_name", "运营主体", required=True, description="运营主体，按实际上传填写", example="A公司"),
        _col("bank_account", "银行账户", required=True, example="6222021234567890001"),
        _col("bank_name", "开户银行", example="招商银行"),
        _col("counterparty", "交易对手", example="比亚迪"),
        _col("income_amount", "入账金额", column_type="number", description="单位：元，收入填此列", example="500000"),
        _col("expense_amount", "出账金额", column_type="number", description="单位：元，支出填此列", example="0"),
        _col("balance_after", "账户余额", column_type="number", description="单位：元", example="12500000"),
        _col("summary", "交易摘要", example="货款支付"),
        _col("trans_type", "交易类型", example="转账"),
        _col("business_source", "业务来源", description="按本公司口径填写", enum_values=BUSINESS_SOURCES, example="OA报销"),
        _col("currency", "币种", description="如 CNY / USD", enum_values=CURRENCIES, example="CNY"),
        _col("doc_no", "单据号", required=True, example="FD-000001"),
    ),
)

TPL_BUDGET = ImportTemplateDefinition(
    code="tpl_budget",
    name="预算导入模板",
    domain="expense",
    version="1.0.0",
    description="预算差异指标辅助数据导入模板",
    fact_table="fact_budget",
    columns=(
        _col("period_month", "预算期间", required=True, column_type="month", description="YYYY-MM", example="2025-06"),
        _col("entity_name", "主体", required=True, description="法人主体或运营主体，按实际上传填写", example="A公司"),
        _col("dimension_type", "预算维度类型", required=True, example="部门"),
        _col("dimension_name", "预算维度名称", required=True, example="研发一部"),
        _col("budget_amount", "预算编制额", required=True, column_type="number", description="单位：元", example="500000"),
        _col("occupied_amount", "占用额", column_type="number", description="单位：元", example="120000"),
    ),
)

IMPORT_TEMPLATES: dict[str, ImportTemplateDefinition] = {
    TPL_EXPENSE_DETAIL.code: TPL_EXPENSE_DETAIL,
    TPL_REVENUE_COST_DETAIL.code: TPL_REVENUE_COST_DETAIL,
    TPL_FUND_TRANSACTION.code: TPL_FUND_TRANSACTION,
    TPL_BUDGET.code: TPL_BUDGET,
}


def list_templates(domain: Domain | None = None) -> list[ImportTemplateDefinition]:
    templates = list(IMPORT_TEMPLATES.values())
    if domain is None:
        return templates
    if domain == "dashboard":
        return [t for t in templates if t.domain in ("expense", "revenue", "fund")]
    return [t for t in templates if t.domain == domain]


def get_template(code: str) -> ImportTemplateDefinition | None:
    return IMPORT_TEMPLATES.get(code)
