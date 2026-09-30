import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { mockMgmtLineCompareByYear } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { colorsForYears, themeHsl } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";
import YearChips from "@/components/dashboard/YearChips";
import { useMultiYearSelection } from "@/components/dashboard/useMultiYearSelection";
import { chartAxisTick, chartGridStroke, chartTooltipStyle, DASHBOARD_YEARS } from "@/components/dashboard/chartTheme";
import { formatPct, formatWan } from "@/components/management/format";

export default function MgmtLineCompareChart() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, currentCompany } = useDataSource();
  const company = currentCompany?.name;
  const { selectedYears, toggleYear, syncAvailable, isCompare, primaryYear } =
    useMultiYearSelection(["2024", "2025"]);

  const queries = useQueries({
    queries: selectedYears.map(year => ({
      queryKey: ["dashboard", "mgmt-line-compare", company, year],
      queryFn: () => api.getManagementReport(company!, Number(year)),
      enabled: Boolean(company) && !isDemo,
    })),
  });

  const liveYears = useMemo(() => {
    const first = queries.find(q => q.data?.available_years?.length)?.data?.available_years;
    return first?.map(String) ?? [];
  }, [queries.map(q => q.dataUpdatedAt).join(",")]);

  useEffect(() => {
    if (liveYears.length) syncAvailable(liveYears);
  }, [liveYears.join(","), syncAvailable]);

  const yearOptions = liveYears.length ? liveYears : [...DASHBOARD_YEARS];
  void theme;
  const colorMap = useMemo(() => colorsForYears(selectedYears), [theme, selectedYears.join(",")]);
  const marginFallback = useMemo(() => themeHsl("--chart-4"), [theme]);

  const liveOk =
    !isDemo &&
    queries.every((q, i) => q.data?.is_live_data && String(q.data.year) === selectedYears[i]);

  const chartData = useMemo(() => {
    const byYear: Record<string, { name: string; revenue: number; margin: number }[]> = {};
    selectedYears.forEach((year, i) => {
      if (liveOk) {
        byYear[year] = (queries[i].data!.lines ?? [])
          .filter(row => row.kind === "line" || row.kind === "unmapped")
          .map(row => ({
            name: row.line_name,
            revenue: row.revenue.year,
            margin: row.gross_margin.year,
          }));
      } else {
        const mock = mockMgmtLineCompareByYear[year] ?? mockMgmtLineCompareByYear["2025"];
        byYear[year] = mock.lines.map(row => ({
          name: row.name,
          revenue: row.revenue,
          margin: row.margin,
        }));
      }
    });

    const names = Array.from(new Set(Object.values(byYear).flatMap(rows => rows.map(r => r.name))));
    return names.map(name => {
      const point: Record<string, string | number> = { name };
      selectedYears.forEach(year => {
        const row = byYear[year]?.find(item => item.name === name);
        point[`revenue_${year}`] = row?.revenue ?? 0;
        point[`margin_${year}`] = row?.margin ?? 0;
      });
      return point;
    });
  }, [selectedYears, liveOk, queries]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate("/management/charts")}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground shrink-0">业务线经营对比</h3>
          <Badge variant="secondary" className="text-[10px]">
            {isDemo || !liveOk ? "演示 mock" : `${company} · 管报`}
            {isCompare ? " · 多年对比" : ` · ${primaryYear}`}
          </Badge>
        </div>
        <YearChips
          multi
          years={yearOptions}
          values={selectedYears}
          onToggle={toggleYear}
          colors={Object.fromEntries(selectedYears.map(y => [y, colorMap[y]?.solid ?? ""]))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {isCompare ? "业务线收入多年对比（万元）" : `${primaryYear} 年业务线收入（万元）`}
          </p>
          <div className="h-[250px] chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke()} vertical={false} />
                <XAxis dataKey="name" tick={chartAxisTick()} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick()} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={chartTooltipStyle()}
                  formatter={(v: number, name: string) => [
                    `${formatWan(v)} 万`,
                    String(name).replace("revenue_", "") + "年",
                  ]}
                />
                {isCompare ? (
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => String(v).replace("revenue_", "") + "年"} />
                ) : null}
                {selectedYears.map(year => (
                  <Bar
                    key={year}
                    dataKey={`revenue_${year}`}
                    name={`revenue_${year}`}
                    fill={colorMap[year]?.solid || themeHsl("--chart-2")}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={isCompare ? 22 : 36}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {isCompare ? "业务线毛利率对比" : `${primaryYear} 年毛利率`}
          </p>
          <div className="h-[250px] chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke()} vertical={false} />
                <XAxis dataKey="name" tick={chartAxisTick()} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick()} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={chartTooltipStyle()}
                  formatter={(v: number, name: string) => [
                    formatPct(v),
                    String(name).replace("margin_", "") + "年毛利率",
                  ]}
                />
                {isCompare ? (
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => String(v).replace("margin_", "") + "年"} />
                ) : null}
                {selectedYears.map(year => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`margin_${year}`}
                    name={`margin_${year}`}
                    stroke={colorMap[year]?.line || marginFallback}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 0, fill: colorMap[year]?.line || marginFallback }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
