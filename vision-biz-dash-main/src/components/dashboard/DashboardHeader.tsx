import { motion } from "framer-motion";
import { Activity, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import CompanySwitcher from "@/components/layout/CompanySwitcher";
import WorkspaceMenu from "@/components/layout/WorkspaceMenu";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";

const DashboardHeader = () => {
  const { selectedView, currentCompany } = useDataSource();

  const freshnessDatasetId = currentCompany
    ? currentCompany.datasets.revenue ??
      currentCompany.datasets.fund ??
      currentCompany.datasets.expense ??
      undefined
    : undefined;

  const { data: freshness } = useQuery({
    queryKey: ["freshness", selectedView],
    queryFn: () => api.getDataFreshness(freshnessDatasetId),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between mb-6 gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold text-foreground tracking-tight leading-none">
            VisionInsight
          </h1>
          <CompanySwitcher className="mt-1" />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{freshness?.label ?? "—"}</span>
        </div>
        <WorkspaceMenu />
      </div>
    </motion.div>
  );
};

export default DashboardHeader;
