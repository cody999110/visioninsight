import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { mockFundFlowByYear } from "@/data/mockData";
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

export default function FundFlowChart() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("fund");
  const { selectedYears, toggleYear, isCompare, primaryYear } = useMultiYearSelection(["2024", "2025"]);

  const queries = useQueries({
    queries: selectedYears.map(year => ({
      queryKey: ["dashboard", "fund-flow", year, datasetId],
      queryFn: () => api.getFundFlow(year, datasetId),
      enabled: !!datasetId && !isDemo,
    })),
  });

  const liveOk = !isDemo && queries.every(q => q.data?.is_live_data && (q.data.points?.length ?? 0) > 0);
  void theme;
  const colorMap = useMemo(() => colorsForYears(selectedYears), [theme, selectedYears.join(",")]);

  const pointsByYear = useMemo(() => {
    const map: Record<string, { month: string; income: number; expense: number; net: number }[]> = {};
    selectedYears.forEach((year, i) => {
      if (liveOk) {
        map[year] = queries[i].data!.points;
      } else {
        map[year] = mockFundFlowByYear[year] ?? mockFundFlowByYear["2025"];
      }
    });
    return map;
  }, [selectedYears, liveOk, queries]);

  const chartData = useMemo(() => {
    if (!isCompare) {
      return pointsByYear[primaryYear] ?? [];
    }
    return MONTHS.map((month, mi) => {
      const point: Record<string, string | number> = { month };
      selectedYears.forEach(year => {
        const row = pointsByYear[year]?.[mi];
        point[`net_${year}`] = row?.net ?? 0;
        point[`income_${year}`] = row?.income ?? 0;
      });
      return point;
    });
  }, [isCompare, pointsByYear, primaryYear, selectedYears]);

  const totals = useMemo(() => {
    return selectedYears.map(year => {
      const rows = pointsByYear[year] ?? [];
      const income = rows.reduce((s, p) => s + p.income, 0);
      const expense = rows.reduce((s, p) => s + p.expense, 0);
      return { year, income, expense, net: income - expense };
    });
  }, [selectedYears, pointsByYear]);

  if (!isDemo && !datasetId) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">资金流入流出</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="fund" domainLabel="资金" />
      </div>
    );
  }

  if (!isDemo && queries.every(q => q.isFetched) && !liveOk) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">资金流入流出</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="fund" domainLabel="资金" />
      </div>
    );
  }

  const incomeColor = themeHsl("--chart-3");
  const expenseColor = themeHsl("--chart-5", 0.75);
  const netColor = themeHsl("--primary");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow h-full"
      onClick={() => navigate("/fund-analysis")}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground shrink-0">资金流入流出</h3>
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

      <div className={`grid gap-3 mb-3 ${isCompare ? "grid-cols-2" : "grid-cols-3"}`}>
        {isCompare
          ? totals.map(item => (
              <div key={item.year} className="rounded-lg bg-muted/40 px-3 py-2 space-y-1 border-l-[3px]" style={{ borderLeftColor: colorMap[item.year]?.solid }}>
                <div className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorMap[item.year]?.solid }} />
                  {item.year} 年
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between gap-2">
                  <span>流入</span>
                  <span className="text-chart-3 font-medium">¥{item.income.toLocaleString()}万</span>
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between gap-2">
                  <span>流出</span>
                  <span className="font-medium text-foreground">¥{item.expense.toLocaleString()}万</span>
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between gap-2">
                  <span>净流</span>
                  <span className={`font-medium ${item.net >= 0 ? "text-primary" : "text-destructive"}`}>
                    ¥{item.net.toLocaleString()}万
                  </span>
                </div>
              </div>
            ))
          : [
              { label: "流入", value: totals[0]?.income ?? 0, className: "text-chart-3" },
              { label: "流出", value: totals[0]?.expense ?? 0, className: "text-foreground" },
              { label: "净流", value: totals[0]?.net ?? 0, className: (totals[0]?.net ?? 0) >= 0 ? "text-primary" : "text-destructive" },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-muted/40 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
                <div className={`text-sm font-display font-semibold ${item.className}`}>
                  ¥{item.value.toLocaleString()}万
                </div>
              </div>
            ))}
      </div>

      <div className="h-[240px] chart-container">
        <ResponsiveContainer width="100%" height="100%">
          {isCompare ? (
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke()} vertical={false} />
              <XAxis dataKey="month" tick={chartAxisTick()} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisTick()} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={chartTooltipStyle()}
                formatter={(v: number, name: string) => {
                  const [kind, year] = String(name).split("_");
                  const label = kind === "net" ? "净流" : "流入";
                  return [`¥${Number(v).toLocaleString()}万`, `${year} ${label}`];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={v => {
                  const [kind, year] = String(v).split("_");
                  return `${year} ${kind === "net" ? "净流" : "流入"}`;
                }}
              />
              {selectedYears.map(year => (
                <Bar
                  key={`income_${year}`}
                  dataKey={`income_${year}`}
                  fill={colorMap[year]?.solid || themeHsl("--chart-2")}
                  radius={[3, 3, 0, 0]}
                  barSize={8}
                  opacity={0.9}
                />
              ))}
              {selectedYears.map(year => (
                <Line
                  key={`net_${year}`}
                  type="monotone"
                  dataKey={`net_${year}`}
                  stroke={colorMap[year]?.line || themeHsl("--chart-4")}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, strokeWidth: 0, fill: colorMap[year]?.line }}
                />
              ))}
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke()} vertical={false} />
              <XAxis dataKey="month" tick={chartAxisTick()} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisTick()} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={chartTooltipStyle()}
                formatter={(v: number, name: string) => [
                  `¥${Number(v).toLocaleString()}万`,
                  name === "income" ? "流入" : name === "expense" ? "流出" : "净流",
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={v => (v === "income" ? "流入" : v === "expense" ? "流出" : "净流")}
              />
              <Bar dataKey="income" fill={incomeColor} radius={[4, 4, 0, 0]} barSize={10} />
              <Bar dataKey="expense" fill={expenseColor} radius={[4, 4, 0, 0]} barSize={10} />
              <Line type="monotone" dataKey="net" stroke={netColor} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
