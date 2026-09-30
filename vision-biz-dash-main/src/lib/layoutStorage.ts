import type { DashboardLayout, LayoutWidget, WidgetId } from "@/lib/dashboardLayout";
import { ALL_WIDGET_IDS, layoutStorageKey, mergeWithCatalog, metaFor } from "@/lib/dashboardLayout";
import { getDefaultLayout, getPresetLayout } from "@/lib/layoutPresets";

function isColSpan(value: unknown): value is 4 | 6 | 8 | 12 {
  return value === 4 || value === 6 || value === 8 || value === 12;
}

function parseWidget(value: unknown): LayoutWidget | null {
  if (!value || typeof value !== "object") return null;
  const w = value as Partial<LayoutWidget>;
  if (typeof w.id !== "string" || !ALL_WIDGET_IDS.includes(w.id as WidgetId)) return null;
  if (typeof w.visible !== "boolean" || typeof w.order !== "number") return null;
  const colSpan = isColSpan(w.colSpan) ? w.colSpan : metaFor(w.id as WidgetId).defaultColSpan;
  return { id: w.id as WidgetId, visible: w.visible, colSpan, order: w.order };
}

function normalizeLayout(raw: unknown): DashboardLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const layout = raw as DashboardLayout;
  if (layout.version !== 1 || typeof layout.presetId !== "string" || !Array.isArray(layout.widgets)) {
    return null;
  }
  const parsed = layout.widgets.map(parseWidget).filter((w): w is LayoutWidget => w !== null);
  if (parsed.length === 0) return null;
  return {
    version: 1,
    presetId: layout.presetId,
    widgets: mergeWithCatalog(parsed),
  };
}

export function loadLayout(companyKey: string): DashboardLayout {
  try {
    const raw = localStorage.getItem(layoutStorageKey(companyKey));
    if (!raw) return getDefaultLayout();
    const parsed = normalizeLayout(JSON.parse(raw));
    return parsed ?? getDefaultLayout();
  } catch {
    return getDefaultLayout();
  }
}

export function saveLayout(companyKey: string, layout: DashboardLayout) {
  try {
    const normalized: DashboardLayout = {
      version: 1,
      presetId: layout.presetId,
      widgets: mergeWithCatalog(layout.widgets),
    };
    localStorage.setItem(layoutStorageKey(companyKey), JSON.stringify(normalized));
  } catch {
    // ignore
  }
}

export function clearLayout(companyKey: string) {
  try {
    localStorage.removeItem(layoutStorageKey(companyKey));
  } catch {
    // ignore
  }
}

export function applyPreset(companyKey: string, presetId: string): DashboardLayout {
  const layout = getPresetLayout(presetId);
  saveLayout(companyKey, layout);
  return loadLayout(companyKey);
}

export function visibleWidgets(layout: DashboardLayout): LayoutWidget[] {
  return [...layout.widgets].filter(w => w.visible).sort((a, b) => a.order - b.order);
}

export function toggleWidgetVisible(layout: DashboardLayout, id: WidgetId, visible: boolean): DashboardLayout {
  const widgets = mergeWithCatalog(layout.widgets).map(w => (w.id === id ? { ...w, visible } : w));
  return { ...layout, presetId: "custom", widgets };
}
