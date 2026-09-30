import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import { mockExpenseByDeptByYear } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { colorsForYears } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";
import YearChips from "@/components/dashboard/YearChips";
import { useMultiYearSelection } from "@/components/dashboard/useMultiYearSelection";
import { DASHBOARD_YEARS } from "@/components/dashboard/chartTheme";

export default function ExpenseDeptChart() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("expense");
  const { selectedYears, toggleYear, primaryYear, compareYear, isCompare } = useMultiYearSelection(["2024", "2025"]);

  const queries = useQueries({
    queries: selectedYears.map(year => ({
      queryKey: ["dashboard", "expense-by-dept", year, datasetId],
      queryFn: () => api.getExpenseByDept(year, datasetId),
      enabled: !!datasetId && !isDemo,
    })),
  });

  const liveOk = !isDemo && queries.every(q => q.data?.is_live_data && (q.data.items?.length ?? 0) > 0);
  void theme;
  const yearColors = useMemo(() => colorsForYears(selectedYears), [theme, selectedYears.join(",")]);

  const rows = useMemo(() => {
    const byYear: Record<string, { name: string; amount: number; percentage: number }[]> = {};
    selectedYears.forEach((year, i) => {
      if (liveOk) {
        byYear[year] = queries[i].data!.items.map(item => ({
          name: item.name,
          amount: item.amount,
          percentage: item.percentage,
        }));
      } else {
        byYear[year] = mockExpenseByDeptByYear[year] ?? mockExpenseByDeptByYear["2025"];
      }
    });

    const names = Array.from(new Set(Object.values(byYear).flatMap(items => items.map(i => i.name))));
    const primaryAmounts = names.map(name => byYear[primaryYear]?.find(i => i.name === name)?.amount ?? 0);
    const max = Math.max(...primaryAmounts, 1);

    return names
      .map(name => {
        const primaryAmount = byYear[primaryYear]?.find(item => item.name === name)?.amount ?? 0;
        const compareAmount = compareYear
          ? byYear[compareYear]?.find(item => item.name === name)?.amount ?? 0
          : null;
        const yoy =
          compareAmount && compareAmount > 0
            ? ((primaryAmount - compareAmount) / compareAmount) * 100
            : null;
        return {
          name,
          primaryAmount,
          compareAmount,
          yoy,
          percentage: byYear[primaryYear]?.find(item => item.name === name)?.percentage ?? 0,
          fill: yearColors[primaryYear]?.solid,
          widthPct: Math.max((primaryAmount / max) * 100, 6),
        };
      })
      .sort((a, b) => b.primaryAmount - a.primaryAmount);
  }, [selectedYears, liveOk, queries, primaryYear, compareYear, yearColors]);

  if (!isDemo && !datasetId) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">部门费用</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="expense" domainLabel="费用" />
      </div>
    );
  }

  if (!isDemo && queries.every(q => q.isFetched) && !liveOk) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">部门费用</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="expense" domainLabel="费用" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow h-full"
      onClick={() => navigate("/expense-analysis")}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground shrink-0">部门费用排行</h3>
          {liveOk && currentCompany?.name ? (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">{currentCompany.name}</Badge>
          ) : null}
        </div>
        <YearChips
          multi
          years={DASHBOARD_YEARS}
          values={selectedYears}
          onToggle={toggleYear}
          colors={Object.fromEntries(selectedYears.map(y => [y, yearColors[y]?.solid ?? ""]))}
        />
      </div>

      {isCompare ? (
        <p className="text-[11px] text-muted-foreground mb-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: yearColors[primaryYear]?.solid }} />
            主年 {primaryYear}
          </span>
          {compareYear ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: yearColors[compareYear]?.solid }} />
              对比 {compareYear}
            </span>
          ) : null}
          <span>（进度条按主年）</span>
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.name} className="p-3 rounded-lg bg-muted/35 hover:bg-accent/40 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary font-display shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{row.name}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs mt-0.5">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: yearColors[primaryYear]?.solid }} />
                    {primaryYear}: ¥{row.primaryAmount.toLocaleString()}万
                  </span>
                  {isCompare && row.compareAmount != null && compareYear ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: yearColors[compareYear]?.solid }} />
                      {compareYear}: ¥{row.compareAmount.toLocaleString()}万
                    </span>
                  ) : (
                    <span className="text-muted-foreground">占比 {row.percentage}%</span>
                  )}
                </div>
              </div>
              {isCompare && row.yoy != null ? (
                <div className={`flex items-center gap-1 text-xs shrink-0 ${row.yoy >= 0 ? "text-destructive" : "text-chart-3"}`}>
                  {row.yoy >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {row.yoy >= 0 ? "+" : ""}
                  {row.yoy.toFixed(1)}%
                </div>
              ) : null}
            </div>
            <div className="h-1.5 rounded-full bg-border/60 overflow-hidden ml-10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${row.widthPct}%`, background: row.fill }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
