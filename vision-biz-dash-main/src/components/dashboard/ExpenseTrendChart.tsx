import { useId, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mockExpenseTrendByYear } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { colorsForYears, themeHsl } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";
import YearChips from "@/components/dashboard/YearChips";
import { useMultiYearSelection } from "@/components/dashboard/useMultiYearSelection";
import { chartAxisTick, chartGridStroke, chartTooltipStyle, DASHBOARD_YEARS } from "@/components/dashboard/chartTheme";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export default function ExpenseTrendChart() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("expense");
  const { selectedYears, toggleYear, isCompare } = useMultiYearSelection(["2024", "2025"]);
  const gradId = useId().replace(/:/g, "");

  const queries = useQueries({
    queries: selectedYears.map(year => ({
      queryKey: ["dashboard", "expense-trend", year, datasetId],
      queryFn: () => api.getExpenseTrend(year, datasetId),
      enabled: !!datasetId && !isDemo,
    })),
  });

  const liveOk = !isDemo && queries.every(q => q.data?.is_live_data && (q.data.points?.length ?? 0) > 0);
  void theme;
  const colorMap = useMemo(() => colorsForYears(selectedYears), [theme, selectedYears.join(",")]);

  const chartData = useMemo(() => {
    return MONTHS.map((month, mi) => {
      const point: Record<string, string | number> = { month };
      selectedYears.forEach((year, yi) => {
        if (liveOk) {
          point[`amount_${year}`] = queries[yi].data!.points[mi]?.amount ?? 0;
        } else {
          const mock = mockExpenseTrendByYear[year] ?? mockExpenseTrendByYear["2025"];
          point[`amount_${year}`] = mock[mi]?.amount ?? 0;
        }
      });
      return point;
    });
  }, [selectedYears, liveOk, queries]);

  if (!isDemo && !datasetId) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">费用月度趋势</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="expense" domainLabel="费用" />
      </div>
    );
  }

  if (!isDemo && queries.every(q => q.isFetched) && !liveOk) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">费用月度趋势</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="expense" domainLabel="费用" />
      </div>
    );
  }

  const yearTotals = selectedYears.map(year => ({
    year,
    total: chartData.reduce((s, row) => s + Number(row[`amount_${year}`] ?? 0), 0),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow h-full"
      onClick={() => navigate("/expense-analysis")}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground shrink-0">费用月度趋势</h3>
          {liveOk && currentCompany?.name ? (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">{currentCompany.name}</Badge>
          ) : null}
        </div>
        <YearChips
          multi
          years={DASHBOARD_YEARS}
          values={selectedYears}
          onToggle={toggleYear}
          colors={Object.fromEntries(selectedYears.map(y => [y, colorMap[y]?.line ?? ""]))}
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-2">
        {yearTotals.map(item => (
          <div key={item.year}>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: colorMap[item.year]?.line }} />
              {item.year} 全年
            </div>
            <div className="text-lg font-display font-semibold text-foreground">¥{item.total.toLocaleString()}万</div>
          </div>
        ))}
      </div>

      <div className="h-[220px] chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              {selectedYears.map(year => {
                const color = colorMap[year]?.line || themeHsl("--chart-4");
                return (
                  <linearGradient key={year} id={`expenseTrend-${gradId}-${year}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={isCompare ? 0.28 : 0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.03} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke()} vertical={false} />
            <XAxis dataKey="month" tick={chartAxisTick()} axisLine={false} tickLine={false} />
            <YAxis tick={chartAxisTick()} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={chartTooltipStyle()}
              formatter={(v: number, name: string) => [
                `¥${Number(v).toLocaleString()}万`,
                name.replace("amount_", "") + "年",
              ]}
            />
            {isCompare ? <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => String(v).replace("amount_", "") + "年"} /> : null}
            {selectedYears.map(year => {
              const color = colorMap[year]?.line || themeHsl("--chart-4");
              return (
                <Area
                  key={year}
                  type="monotone"
                  dataKey={`amount_${year}`}
                  name={`amount_${year}`}
                  stroke={color}
                  fill={`url(#expenseTrend-${gradId}-${year})`}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
