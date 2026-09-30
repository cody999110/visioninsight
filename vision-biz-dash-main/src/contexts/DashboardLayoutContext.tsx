import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DashboardLayout, WidgetId } from "@/lib/dashboardLayout";
import { applyPreset, clearLayout, loadLayout, saveLayout, toggleWidgetVisible } from "@/lib/layoutStorage";
import { getDefaultLayout } from "@/lib/layoutPresets";
import { useDataSource } from "@/contexts/DataSourceContext";

interface DashboardLayoutContextValue {
  layout: DashboardLayout;
  companyKey: string;
  applyLayoutPreset: (presetId: string) => void;
  resetToClassic: () => void;
  setLayout: (layout: DashboardLayout) => void;
  setWidgetVisible: (id: WidgetId, visible: boolean) => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
  const { selectedView } = useDataSource();
  const companyKey = selectedView;
  const [layout, setLayoutState] = useState<DashboardLayout>(() => getDefaultLayout());

  useEffect(() => {
    setLayoutState(loadLayout(companyKey));
  }, [companyKey]);

  const setLayout = useCallback(
    (next: DashboardLayout) => {
      setLayoutState(next);
      saveLayout(companyKey, next);
    },
    [companyKey],
  );

  const applyLayoutPreset = useCallback(
    (presetId: string) => {
      setLayoutState(applyPreset(companyKey, presetId));
    },
    [companyKey],
  );

  const resetToClassic = useCallback(() => {
    clearLayout(companyKey);
    const classic = getDefaultLayout();
    saveLayout(companyKey, classic);
    setLayoutState(loadLayout(companyKey));
  }, [companyKey]);

  const setWidgetVisible = useCallback(
    (id: WidgetId, visible: boolean) => {
      setLayoutState(prev => {
        const next = toggleWidgetVisible(prev, id, visible);
        saveLayout(companyKey, next);
        return next;
      });
    },
    [companyKey],
  );

  const value = useMemo(
    () => ({ layout, companyKey, applyLayoutPreset, resetToClassic, setLayout, setWidgetVisible }),
    [layout, companyKey, applyLayoutPreset, resetToClassic, setLayout, setWidgetVisible],
  );

  return <DashboardLayoutContext.Provider value={value}>{children}</DashboardLayoutContext.Provider>;
}

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
  return ctx;
}
