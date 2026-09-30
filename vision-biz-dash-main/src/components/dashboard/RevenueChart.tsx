import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { revenueGrossProfitData, years as mockYears } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";
import { chartYearColors, themeHsl } from "@/lib/chartColors";
import { useTheme } from "@/contexts/ThemeContext";

const RevenueChart = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("revenue");

  const { data } = useQuery({
    queryKey: ["dashboard", "revenue-trend", datasetId],
    queryFn: () => api.getRevenueTrend([], datasetId),
    enabled: !!datasetId,
  });

  const live = !isDemo && data?.is_live_data;
  const liveYears = live ? Object.keys(data.years) : [];
  const availableYears = liveYears.length ? liveYears : [...mockYears];
  const [selectedYears, setSelectedYears] = useState<string[]>([availableYears[availableYears.length - 1] ?? "2025"]);

  useEffect(() => {
    if (liveYears.length) {
      setSelectedYears([liveYears[liveYears.length - 1]]);
    }
  }, [liveYears.join(",")]);

  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.length > 1 ? prev.filter((y) => y !== year) : prev
        : [...prev, year]
    );
  };

  const chartData = useMemo(() => {
    const baseYear = selectedYears[0] ?? "2025";
    const mockBase = revenueGrossProfitData[baseYear as keyof typeof revenueGrossProfitData] ?? revenueGrossProfitData["2025"];

    return mockBase.map((item, i) => {
      const point: Record<string, unknown> = { month: item.month };
      selectedYears.forEach((year) => {
        if (live && data.years[year]?.[i]) {
          const yearData = data.years[year][i];
          point[`revenue_${year}`] = yearData.revenue;
          point[`grossProfit_${year}`] = yearData.gross_profit;
          point[`grossMargin_${year}`] = yearData.gross_margin;
        } else {
          const yearData = revenueGrossProfitData[year as keyof typeof revenueGrossProfitData];
          if (yearData?.[i]) {
            point[`revenue_${year}`] = yearData[i].revenue;
            point[`grossProfit_${year}`] = yearData[i].grossProfit;
            point[`grossMargin_${year}`] = yearData[i].grossMargin;
          }
        }
      });
      return point;
    });
  }, [selectedYears, data, live]);

  const colorMap = useMemo(() => {
    void theme;
    return chartYearColors();
  }, [theme]);
  const fallbackBar = themeHsl("--primary", 0.55);
  const fallbackLine = themeHsl("--primary");

  if (!isDemo && !live) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">收入与毛利趋势</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="revenue" domainLabel="收入" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate("/revenue-analysis")}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-foreground">收入与毛利趋势</h3>
          {live && currentCompany?.name ? (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">{currentCompany.name}</Badge>
          ) : null}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={(e) => { e.stopPropagation(); toggleYear(year); }}
              className={`filter-chip ${selectedYears.includes(year) ? "filter-chip-active" : ""}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-container h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 90%)" strokeOpacity={0.8} />
            <XAxis dataKey="month" tick={{ fill: "hsl(240, 6%, 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fill: "hsl(240, 6%, 45%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v >= 10000 ? `${v / 10000}万` : v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "hsl(240, 6%, 45%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(240, 10%, 90%)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                if (name.startsWith("grossMargin")) return [`${value}%`, "毛利率"];
                return [`¥${value.toLocaleString()}万`, name.startsWith("revenue") ? "收入" : "毛利"];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedYears.map((year) => (
              <Bar
                key={`rev_${year}`}
                yAxisId="left"
                dataKey={`revenue_${year}`}
                fill={colorMap[year]?.bar || fallbackBar}
                radius={[3, 3, 0, 0]}
                barSize={selectedYears.length > 2 ? 12 : 20}
                opacity={0.9}
              />
            ))}
            {selectedYears.map((year) => (
              <Line
                key={`gm_${year}`}
                yAxisId="right"
                type="monotone"
                dataKey={`grossMargin_${year}`}
                stroke={colorMap[year]?.line || fallbackLine}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default RevenueChart;
