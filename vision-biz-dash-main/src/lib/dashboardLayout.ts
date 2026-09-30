export type WidgetId =
  | "kpi"
  | "ops_kpi"
  | "revenue"
  | "customers"
  | "map"
  | "margin"
  | "expense"
  | "biz_line_revenue"
  | "expense_trend"
  | "expense_dept"
  | "fund_flow"
  | "mgmt_line_compare";

export type WidgetGroup = "fund" | "ops" | "revenue" | "expense" | "management";

export interface LayoutWidget {
  id: WidgetId;
  visible: boolean;
  /** 12-column grid span */
  colSpan: 4 | 6 | 8 | 12;
  order: number;
}

export interface DashboardLayout {
  version: 1;
  presetId: string;
  widgets: LayoutWidget[];
}

export interface LayoutPresetMeta {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
}

export interface WidgetMeta {
  id: WidgetId;
  title: string;
  description: string;
  group: WidgetGroup;
  defaultColSpan: 4 | 6 | 8 | 12;
}

export const LAYOUT_VERSION = 1 as const;

export const WIDGET_META: WidgetMeta[] = [
  { id: "kpi", title: "资金 KPI", description: "余额与资金结构", group: "fund", defaultColSpan: 12 },
  { id: "ops_kpi", title: "经营 KPI", description: "收入、毛利、费用一览", group: "ops", defaultColSpan: 12 },
  { id: "revenue", title: "收入与毛利趋势", description: "月度收入与毛利率", group: "revenue", defaultColSpan: 8 },
  { id: "customers", title: "Top 客户", description: "客户贡献排行", group: "revenue", defaultColSpan: 4 },
  { id: "map", title: "区域地图", description: "省份销售分布", group: "revenue", defaultColSpan: 4 },
  { id: "margin", title: "产品毛利率", description: "核心产品毛利", group: "revenue", defaultColSpan: 4 },
  { id: "biz_line_revenue", title: "业务线收入", description: "按业务线汇总收入", group: "revenue", defaultColSpan: 6 },
  { id: "expense", title: "费用结构", description: "费用大类占比", group: "expense", defaultColSpan: 4 },
  { id: "expense_trend", title: "费用月度趋势", description: "费用发生节奏", group: "expense", defaultColSpan: 6 },
  { id: "expense_dept", title: "部门费用", description: "部门费用排行", group: "expense", defaultColSpan: 6 },
  { id: "fund_flow", title: "资金流入流出", description: "月度入账与出账", group: "fund", defaultColSpan: 8 },
  { id: "mgmt_line_compare", title: "业务线经营对比", description: "管报口径收入/毛利", group: "management", defaultColSpan: 12 },
];

export const ALL_WIDGET_IDS: WidgetId[] = WIDGET_META.map(w => w.id);

export const WIDGET_GROUP_LABELS: Record<WidgetGroup, string> = {
  fund: "资金",
  ops: "经营总览",
  revenue: "收入",
  expense: "费用",
  management: "管理口径",
};

export function layoutStorageKey(companyKey: string) {
  return `vi-dashboard-layout:v${LAYOUT_VERSION}:${companyKey}`;
}

export function metaFor(id: WidgetId): WidgetMeta {
  return WIDGET_META.find(w => w.id === id)!;
}

/** 合并已知模块：保留已存配置，缺的补 hidden；未知 id 已在解析阶段丢弃 */
export function mergeWithCatalog(widgets: LayoutWidget[]): LayoutWidget[] {
  const byId = new Map(widgets.map(w => [w.id, w]));
  const maxOrder = widgets.reduce((max, w) => Math.max(max, w.order), -1);
  let nextOrder = maxOrder + 1;
  return ALL_WIDGET_IDS.map(id => {
    const existing = byId.get(id);
    if (existing) return { ...existing };
    const meta = metaFor(id);
    return { id, visible: false, colSpan: meta.defaultColSpan, order: nextOrder++ };
  });
}
