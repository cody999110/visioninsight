import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import type { WidgetId } from "@/lib/dashboardLayout";
import { visibleWidgets } from "@/lib/layoutStorage";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import KpiCards from "@/components/dashboard/KpiCards";
import OpsKpiCards from "@/components/dashboard/OpsKpiCards";
import RevenueChart from "@/components/dashboard/RevenueChart";
import ChinaMapChart from "@/components/dashboard/ChinaMapChart";
import TopCustomers from "@/components/dashboard/TopCustomers";
import ProductMarginChart from "@/components/dashboard/ProductMarginChart";
import ExpensesChart from "@/components/dashboard/ExpensesChart";
import BizLineRevenueChart from "@/components/dashboard/BizLineRevenueChart";
import ExpenseTrendChart from "@/components/dashboard/ExpenseTrendChart";
import ExpenseDeptChart from "@/components/dashboard/ExpenseDeptChart";
import FundFlowChart from "@/components/dashboard/FundFlowChart";
import MgmtLineCompareChart from "@/components/dashboard/MgmtLineCompareChart";

const COL_SPAN: Record<4 | 6 | 8 | 12, string> = {
  4: "lg:col-span-4",
  6: "lg:col-span-6",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

const WIDGET_RENDERERS: Record<WidgetId, () => ReactNode> = {
  kpi: () => <KpiCards />,
  ops_kpi: () => <OpsKpiCards />,
  revenue: () => <RevenueChart />,
  customers: () => <TopCustomers />,
  map: () => <ChinaMapChart />,
  margin: () => <ProductMarginChart />,
  expense: () => <ExpensesChart />,
  biz_line_revenue: () => <BizLineRevenueChart />,
  expense_trend: () => <ExpenseTrendChart />,
  expense_dept: () => <ExpenseDeptChart />,
  fund_flow: () => <FundFlowChart />,
  mgmt_line_compare: () => <MgmtLineCompareChart />,
};

export default function DashboardCanvas() {
  const { layout } = useDashboardLayout();
  const widgets = visibleWidgets(layout);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {widgets.map((widget, index) => (
        <motion.div
          key={`${layout.presetId}-${widget.id}`}
          className={`col-span-1 min-w-0 ${COL_SPAN[widget.colSpan]}`}
          style={{ "--stagger": index } as CSSProperties}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: index * 0.04 }}
        >
          {WIDGET_RENDERERS[widget.id]()}
        </motion.div>
      ))}
    </div>
  );
}
