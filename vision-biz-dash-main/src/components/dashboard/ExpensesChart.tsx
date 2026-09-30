import { operatingExpenses as mockOperatingExpenses } from "@/data/mockData";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";
import { themeHsl } from "@/lib/chartColors";
import { useTheme } from "@/contexts/ThemeContext";

const ExpensesChart = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("expense");
  const [selectedYear, setSelectedYear] = useState<"2025" | "2024">("2025");

  const { data } = useQuery({
    queryKey: ["dashboard", "expense-structure", selectedYear, datasetId],
    queryFn: () => api.getExpenseStructure(selectedYear, datasetId),
    enabled: !!datasetId,
  });

  const liveData = !isDemo && data?.is_live_data && data.items.length
    ? data.items.map(item => ({
        category: item.category,
        amount: item.amount,
        percentage: item.percentage,
        color: item.color,
      }))
    : null;

  if (!isDemo && !liveData) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">运营费用结构</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="expense" domainLabel="费用" />
      </div>
    );
  }

  // API + mock amounts are both in 万元.
  void theme;
  const raw = liveData ?? mockOperatingExpenses[selectedYear];
  const dataForYear = raw.map((item, i) => ({
    ...item,
    color: themeHsl(`--chart-${(i % 5) + 1}`),
  }));
  const total = dataForYear.reduce((sum, item) => sum + item.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate("/expense-analysis")}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground shrink-0">运营费用结构</h3>
          {liveData && currentCompany?.name ? (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">
              {currentCompany.name}
            </Badge>
          ) : null}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {(["2024", "2025"] as const).map((year) => (
            <button
              key={year}
              onClick={(e) => { e.stopPropagation(); setSelectedYear(year); }}
              className={`filter-chip ${selectedYear === year ? "filter-chip-active" : ""}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="chart-container h-[220px] w-[220px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dataForYear} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="amount">
                {dataForYear.map((entry, index) => (
                  <Cell key={index} fill={entry.color} opacity={0.9} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`¥${Number(value).toLocaleString()}万`, "金额"]} />
              <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" fill="hsl(240, 10%, 15%)" fontSize={14} fontWeight={700}>
                ¥{total.toFixed(1)}万
              </text>
              <text x="50%" y="60%" textAnchor="middle" dominantBaseline="central" fill="hsl(240, 6%, 45%)" fontSize={10}>
                总费用
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2 pt-2">
          {dataForYear.map((item) => (
            <div key={item.category} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
              <span className="text-muted-foreground flex-1">{item.category}</span>
              <span className="text-foreground font-medium tabular-nums">¥{item.amount.toLocaleString()}万</span>
              <span className="text-muted-foreground w-10 text-right tabular-nums">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ExpensesChart;
