import type { DashboardLayout, LayoutPresetMeta, LayoutWidget, WidgetId } from "@/lib/dashboardLayout";
import { ALL_WIDGET_IDS, mergeWithCatalog, metaFor } from "@/lib/dashboardLayout";

function buildWidgets(visible: Partial<Record<WidgetId, { colSpan?: 4 | 6 | 8 | 12; order: number }>>): LayoutWidget[] {
  const listed = new Map(
    Object.entries(visible).map(([id, cfg]) => [
      id as WidgetId,
      {
        id: id as WidgetId,
        visible: true,
        colSpan: cfg.colSpan ?? metaFor(id as WidgetId).defaultColSpan,
        order: cfg.order,
      } satisfies LayoutWidget,
    ]),
  );

  let order = Object.values(visible).reduce((max, cfg) => Math.max(max, cfg.order), -1) + 1;
  const rest: LayoutWidget[] = ALL_WIDGET_IDS.filter(id => !listed.has(id)).map(id => ({
    id,
    visible: false,
    colSpan: metaFor(id).defaultColSpan,
    order: order++,
  }));

  return mergeWithCatalog([...listed.values(), ...rest]);
}

function layout(presetId: string, visible: Partial<Record<WidgetId, { colSpan?: 4 | 6 | 8 | 12; order: number }>>): DashboardLayout {
  return { version: 1, presetId, widgets: buildWidgets(visible) };
}

/** 经典：对齐当前首页 */
const classic = layout("classic", {
  kpi: { colSpan: 12, order: 0 },
  revenue: { colSpan: 8, order: 1 },
  customers: { colSpan: 4, order: 2 },
  map: { colSpan: 4, order: 3 },
  margin: { colSpan: 4, order: 4 },
  expense: { colSpan: 4, order: 5 },
});

/** 经营概览：经营 KPI + 收入结构 + 区域 */
const overview = layout("overview", {
  ops_kpi: { colSpan: 12, order: 0 },
  revenue: { colSpan: 6, order: 1 },
  biz_line_revenue: { colSpan: 6, order: 2 },
  map: { colSpan: 6, order: 3 },
  customers: { colSpan: 6, order: 4 },
});

/** 费用管控 */
const costControl = layout("cost_control", {
  expense: { colSpan: 4, order: 0 },
  expense_trend: { colSpan: 8, order: 1 },
  expense_dept: { colSpan: 6, order: 2 },
  mgmt_line_compare: { colSpan: 6, order: 3 },
});

/** 资金健康：资金 KPI + 流水，可并存经营 KPI */
const cashOps = layout("cash_ops", {
  kpi: { colSpan: 12, order: 0 },
  fund_flow: { colSpan: 8, order: 1 },
  ops_kpi: { colSpan: 4, order: 2 },
  revenue: { colSpan: 6, order: 3 },
  expense: { colSpan: 6, order: 4 },
});

/** 经营管理：管报口径 */
const mgmtFocus = layout("mgmt_focus", {
  ops_kpi: { colSpan: 12, order: 0 },
  mgmt_line_compare: { colSpan: 12, order: 1 },
  biz_line_revenue: { colSpan: 6, order: 2 },
  margin: { colSpan: 6, order: 3 },
});

export const LAYOUT_PRESETS: LayoutPresetMeta[] = [
  {
    id: "classic",
    name: "经典",
    description: "与当前首页一致：资金 KPI、收入、客户、地图、毛利与费用",
    layout: classic,
  },
  {
    id: "overview",
    name: "经营概览",
    description: "经营 KPI + 业务线收入 + 区域地图",
    layout: overview,
  },
  {
    id: "cost_control",
    name: "费用管控",
    description: "费用结构、月度趋势与部门排行",
    layout: costControl,
  },
  {
    id: "cash_ops",
    name: "资金健康",
    description: "资金 KPI 与流入流出，可并存经营 KPI",
    layout: cashOps,
  },
  {
    id: "mgmt_focus",
    name: "经营管理",
    description: "管报口径业务线对比与经营 KPI",
    layout: mgmtFocus,
  },
];

export function getPresetLayout(presetId: string): DashboardLayout {
  const found = LAYOUT_PRESETS.find(p => p.id === presetId);
  return structuredClone(found?.layout ?? classic);
}

export function getDefaultLayout(): DashboardLayout {
  return structuredClone(classic);
}
