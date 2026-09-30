import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { productGrossMargin as mockProductGrossMargin } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";
import { themeHsl } from "@/lib/chartColors";
import { useTheme } from "@/contexts/ThemeContext";

const ProductMarginChart = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("revenue");

  const { data } = useQuery({
    queryKey: ["dashboard", "product-margin", datasetId],
    queryFn: () => api.getProductMargin(datasetId),
    enabled: !!datasetId,
  });

  const live = !isDemo && data?.is_live_data && data.items.length > 0;

  if (!isDemo && !live) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">核心产品毛利率</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="revenue" domainLabel="收入" />
      </div>
    );
  }

  void theme;
  const chartData = live
    ? data.items.map((item, i) => ({
        name: item.name,
        margin: item.margin,
        revenue: item.revenue,
        color: item.color || themeHsl(`--chart-${(i % 5) + 1}`),
      }))
    : mockProductGrossMargin.map((item, i) => ({
        ...item,
        color: themeHsl(`--chart-${(i % 5) + 1}`),
      }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate("/revenue-analysis")}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-display text-base font-semibold text-foreground">核心产品毛利率</h3>
        {live && currentCompany?.name ? (
          <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">{currentCompany.name}</Badge>
        ) : null}
      </div>
      <div className="chart-container h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 90%)" strokeOpacity={0.8} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={65} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => [`${value}%`, "毛利率"]} />
            <Bar dataKey="margin" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} opacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default ProductMarginChart;
