import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mockBizLineRevenueByYear } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { colorsForYears, themeHsl } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";
import YearChips from "@/components/dashboard/YearChips";
import { useMultiYearSelection } from "@/components/dashboard/useMultiYearSelection";
import { chartAxisTick, chartGridStroke, chartTooltipStyle, DASHBOARD_YEARS } from "@/components/dashboard/chartTheme";

export default function BizLineRevenueChart() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("revenue");
  const { selectedYears, toggleYear, isCompare } = useMultiYearSelection(["2024", "2025"]);

  const queries = useQueries({
    queries: selectedYears.map(year => ({
      queryKey: ["dashboard", "business-line-revenue", year, datasetId],
      queryFn: () => api.getBusinessLineRevenue(year, datasetId),
      enabled: !!datasetId && !isDemo,
    })),
  });

  const liveOk = !isDemo && queries.every(q => q.data?.is_live_data && (q.data.items?.length ?? 0) > 0);
  const settledEmpty = !isDemo && !!datasetId && queries.every(q => q.isFetched) && !liveOk;
  void theme;
  const colorMap = useMemo(() => colorsForYears(selectedYears), [theme, selectedYears.join(",")]);
  const fallback = themeHsl("--chart-4");

  const chartData = useMemo(() => {
    const byYear: Record<string, { name: string; amount: number }[]> = {};
    selectedYears.forEach((year, i) => {
      if (liveOk) {
        byYear[year] = queries[i].data!.items.map(item => ({ name: item.name, amount: item.amount }));
      } else {
        byYear[year] = (mockBizLineRevenueByYear[year] ?? mockBizLineRevenueByYear["2025"]).map(item => ({
          name: item.name,
          amount: item.amount,
        }));
      }
    });

    const names = Array.from(
      new Set(Object.values(byYear).flatMap(items => items.map(item => item.name))),
    );
    return names.map(name => {
      const point: Record<string, string | number> = { name };
      selectedYears.forEach(year => {
        point[`amount_${year}`] = byYear[year]?.find(item => item.name === name)?.amount ?? 0;
      });
      return point;
    });
  }, [selectedYears, liveOk, queries]);

  if ((!isDemo && !datasetId) || settledEmpty) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">业务线收入</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="revenue" domainLabel="收入" />
      </div>
    );
  }

  const totals = selectedYears.map(year => ({
    year,
    total: chartData.reduce((sum, row) => sum + Number(row[`amount_${year}`] ?? 0), 0),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow h-full"
      onClick={() => navigate("/revenue-analysis")}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground shrink-0">业务线收入</h3>
          {liveOk && currentCompany?.name ? (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">{currentCompany.name}</Badge>
          ) : null}
        </div>
        <YearChips
          multi
          years={DASHBOARD_YEARS}
          values={selectedYears}
          onToggle={toggleYear}
          colors={Object.fromEntries(selectedYears.map(y => [y, colorMap[y]?.solid ?? ""]))}
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {totals.map(item => (
          <div key={item.year} className="min-w-[100px]">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: colorMap[item.year]?.solid }} />
              {item.year} 年合计
            </div>
            <div className="text-lg font-display font-semibold text-foreground">
              ¥{item.total.toLocaleString()}万
            </div>
          </div>
        ))}
        {isCompare && totals.length >= 2 ? (
          <div className="min-w-[100px]">
            <div className="text-[11px] text-muted-foreground">同比变化</div>
            <div className="text-lg font-display font-semibold text-primary">
              {(() => {
                const latest = totals[totals.length - 1].total;
                const prev = totals[totals.length - 2].total;
                if (!prev) return "—";
                const pct = ((latest - prev) / prev) * 100;
                return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
              })()}
            </div>
          </div>
        ) : null}
      </div>

      <div className="h-[220px] chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke()} vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick()} axisLine={false} tickLine={false} />
            <YAxis tick={chartAxisTick()} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={chartTooltipStyle()}
              formatter={(v: number, name: string) => [
                `¥${Number(v).toLocaleString()}万`,
                name.replace("amount_", "") + "年",
              ]}
            />
            {isCompare ? <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => String(v).replace("amount_", "") + "年"} /> : null}
            {selectedYears.map(year => (
              <Bar
                key={year}
                dataKey={`amount_${year}`}
                name={`amount_${year}`}
                fill={colorMap[year]?.solid || fallback}
                radius={[5, 5, 0, 0]}
                maxBarSize={isCompare ? 22 : 42}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
