/** Helpers for analysis pages to query uploaded Campaign dataset rows. */

export type ExpenseLiveRow = {
  id: string;
  date: string;
  entity: string;
  department: string;
  salesPerson: string;
  customer: string;
  project: string;
  category: string;
  subject: string;
  costCenter: string;
  amount: number;
  currency: string;
  docNo: string;
  summary: string;
  supplier: string;
  status: string;
};

export type RevenueLiveRow = {
  id: string;
  date: string;
  entity: string;
  businessLine: string;
  customer: string;
  salesPerson: string;
  product: string;
  region: string;
  province: string;
  revenueType: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  cost: number;
  currency: string;
  docNo: string;
};

export type FundLiveRow = {
  id: string;
  date: string;
  entity: string;
  bankAccount: string;
  bankName: string;
  counterparty: string;
  incomeAmount: number;
  expenseAmount: number;
  balanceAfter: number;
  summary: string;
  transType: string;
  businessSource: string;
  currency: string;
  docNo: string;
};

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapExpenseLiveRows(rows: Record<string, unknown>[]): ExpenseLiveRow[] {
  return rows.map((row, index) => ({
    id: text(row.doc_no) || `EXP-${index + 1}`,
    date: text(row.trans_date),
    entity: text(row.entity_name),
    department: text(row.department_name),
    salesPerson: text(row.sales_person),
    customer: text(row.customer_name),
    project: text(row.project_name),
    category: text(row.expense_category),
    subject: text(row.expense_subject),
    costCenter: text(row.cost_center),
    amount: num(row.amount),
    currency: text(row.currency) || "CNY",
    docNo: text(row.doc_no),
    summary: text(row.summary),
    supplier: text(row.supplier_name),
    status: text(row.approval_status),
  }));
}

export function mapRevenueLiveRows(rows: Record<string, unknown>[]): RevenueLiveRow[] {
  return rows.map((row, index) => ({
    id: text(row.doc_no) || `REV-${index + 1}`,
    date: text(row.trans_date),
    entity: text(row.entity_name),
    businessLine: text(row.business_line),
    customer: text(row.customer_name),
    salesPerson: text(row.sales_person),
    product: text(row.product_name),
    region: text(row.region),
    province: text(row.province),
    revenueType: text(row.revenue_type),
    quantity: num(row.quantity),
    unitPrice: num(row.unit_price),
    revenue: num(row.revenue),
    cost: num(row.cost),
    currency: text(row.currency) || "CNY",
    docNo: text(row.doc_no),
  }));
}

export function mapFundLiveRows(rows: Record<string, unknown>[]): FundLiveRow[] {
  return rows.map((row, index) => ({
    id: text(row.doc_no) || `FD-${index + 1}`,
    date: text(row.trans_date),
    entity: text(row.entity_name),
    bankAccount: text(row.bank_account),
    bankName: text(row.bank_name),
    counterparty: text(row.counterparty),
    incomeAmount: num(row.income_amount),
    expenseAmount: num(row.expense_amount),
    balanceAfter: num(row.balance_after),
    summary: text(row.summary),
    transType: text(row.trans_type),
    businessSource: text(row.business_source),
    currency: text(row.currency) || "CNY",
    docNo: text(row.doc_no),
  }));
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh"));
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function filterExpenseRows(
  rows: ExpenseLiveRow[],
  filters: {
    entity?: string;
    categories?: string[];
    subjects?: string[];
    periodStart?: string;
    periodEnd?: string;
  },
): ExpenseLiveRow[] {
  return rows.filter(row => {
    if (filters.entity && filters.entity !== "全部" && row.entity && row.entity !== filters.entity) {
      return false;
    }
    if (filters.categories?.length && !filters.categories.includes(row.category)) {
      return false;
    }
    if (filters.subjects?.length && !filters.subjects.includes(row.subject)) {
      return false;
    }
    const month = monthKey(row.date);
    if (filters.periodStart && month && month < filters.periodStart) return false;
    if (filters.periodEnd && month && month > filters.periodEnd) return false;
    return true;
  });
}

const EXPENSE_DIM: Record<string, keyof ExpenseLiveRow> = {
  部门: "department",
  销售人员: "salesPerson",
  客户: "customer",
  项目: "project",
  供应商: "supplier",
  费用科目: "subject",
  成本中心: "costCenter",
  月份: "date",
};

export function groupExpenseLiveRows(
  rows: ExpenseLiveRow[],
  groupBy: string[],
  metrics: string[],
): Record<string, unknown>[] {
  const buckets = new Map<string, { keys: Record<string, string>; amount: number; count: number }>();

  for (const row of rows) {
    const keys: Record<string, string> = {};
    for (const dim of groupBy) {
      if (dim === "月份") {
        keys[dim] = monthKey(row.date) || "—";
      } else {
        const field = EXPENSE_DIM[dim];
        keys[dim] = field ? text(row[field]) || "—" : "—";
      }
    }
    const id = groupBy.map(dim => keys[dim]).join("||") || "__all__";
    const bucket = buckets.get(id) ?? { keys, amount: 0, count: 0 };
    bucket.amount += row.amount;
    bucket.count += 1;
    buckets.set(id, bucket);
  }

  return Array.from(buckets.values()).map(bucket => {
    const out: Record<string, unknown> = { ...bucket.keys };
    const amountWan = Number((bucket.amount / 10000).toFixed(2));
    if (metrics.includes("费用发生额")) out["费用发生额"] = amountWan;
    if (metrics.includes("费用率")) out["费用率"] = null;
    if (metrics.includes("同比")) out["同比"] = null;
    if (metrics.includes("环比")) out["环比"] = null;
    if (metrics.includes("预算差异额")) out["预算差异额"] = null;
    if (metrics.includes("预算差异率")) out["预算差异率"] = null;
    if (metrics.includes("人均费用")) out["人均费用"] = Number((amountWan / Math.max(bucket.count, 1)).toFixed(2));
    if (metrics.includes("客户均摊费用")) out["客户均摊费用"] = amountWan;
    return out;
  });
}

export function toExpenseDetailView(rows: ExpenseLiveRow[]) {
  return rows.map(row => ({
    id: row.id,
    date: row.date,
    entity: row.entity,
    department: row.department,
    salesPerson: row.salesPerson,
    customer: row.customer,
    project: row.project,
    subject: row.subject,
    amount: Number((row.amount / 10000).toFixed(2)),
    currency: row.currency,
    docNo: row.docNo,
    summary: row.summary,
    supplier: row.supplier,
    status: row.status,
  }));
}

export function filterRevenueRows(
  rows: RevenueLiveRow[],
  filters: {
    entity?: string;
    businessLines?: string[];
    types?: string[];
    regions?: string[];
    customers?: string[];
    periodStart?: string;
    periodEnd?: string;
  },
): RevenueLiveRow[] {
  return rows.filter(row => {
    if (filters.entity && filters.entity !== "全部" && row.entity && row.entity !== filters.entity) return false;
    if (filters.businessLines?.length && row.businessLine && !filters.businessLines.includes(row.businessLine)) return false;
    if (filters.types?.length && row.revenueType && !filters.types.includes(row.revenueType)) return false;
    if (filters.regions?.length && row.region && !filters.regions.includes(row.region)) return false;
    if (filters.customers?.length && row.customer && !filters.customers.includes(row.customer)) return false;
    const month = monthKey(row.date);
    if (filters.periodStart && month && month < filters.periodStart) return false;
    if (filters.periodEnd && month && month > filters.periodEnd) return false;
    return true;
  });
}

const REVENUE_DIM: Record<string, keyof RevenueLiveRow> = {
  客户名称: "customer",
  品名: "product",
  业务线: "businessLine",
  销售人员: "salesPerson",
  销售区域: "region",
  省份: "province",
  主体: "entity",
  月份: "date",
};

export function groupRevenueLiveRows(
  rows: RevenueLiveRow[],
  dimensions: string[],
  metrics: string[],
): Record<string, unknown>[] {
  const buckets = new Map<string, { keys: Record<string, string>; revenue: number; cost: number }>();
  for (const row of rows) {
    const keys: Record<string, string> = {};
    for (const dim of dimensions) {
      if (dim === "月份") keys[dim] = monthKey(row.date) || "—";
      else {
        const field = REVENUE_DIM[dim];
        keys[dim] = field ? text(row[field]) || "—" : "—";
      }
    }
    const id = dimensions.map(dim => keys[dim]).join("||") || "__all__";
    const bucket = buckets.get(id) ?? { keys, revenue: 0, cost: 0 };
    bucket.revenue += row.revenue;
    bucket.cost += row.cost;
    buckets.set(id, bucket);
  }
  return Array.from(buckets.values()).map(bucket => {
    const out: Record<string, unknown> = { ...bucket.keys };
    const revenueWan = Number((bucket.revenue / 10000).toFixed(2));
    const costWan = Number((bucket.cost / 10000).toFixed(2));
    const gp = Number((revenueWan - costWan).toFixed(2));
    if (metrics.includes("收入")) out["收入"] = revenueWan;
    if (metrics.includes("成本")) out["成本"] = costWan;
    if (metrics.includes("毛利")) out["毛利"] = gp;
    if (metrics.includes("毛利率")) out["毛利率"] = revenueWan ? Number(((gp / revenueWan) * 100).toFixed(1)) : null;
    return out;
  });
}

export function toRevenueDetailView(rows: RevenueLiveRow[]) {
  return rows.map(row => {
    const revenue = Number((row.revenue / 10000).toFixed(2));
    const cost = Number((row.cost / 10000).toFixed(2));
    const grossProfit = Number((revenue - cost).toFixed(2));
    return {
      id: row.id,
      date: row.date,
      entity: row.entity,
      businessLine: row.businessLine,
      customerCode: "",
      customerName: row.customer,
      salesPerson: row.salesPerson,
      salesChannel: "",
      productCode: "",
      productName: row.product,
      spec: "",
      model: "",
      region: row.region,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      revenue,
      cost,
      grossProfit,
      grossMargin: revenue ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0,
      docNo: row.docNo,
      currency: row.currency,
    };
  });
}
