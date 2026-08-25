import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { topCustomers as mockTopCustomers } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";

const TopCustomers = () => {
  const navigate = useNavigate();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("revenue");

  const { data } = useQuery({
    queryKey: ["dashboard", "top-customers", datasetId],
    queryFn: () => api.getTopCustomers(datasetId),
    enabled: !!datasetId,
  });

  const live = !isDemo && data?.is_live_data && data.items.length > 0;

  if (!isDemo && !live) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">前五大客户</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="revenue" domainLabel="收入" />
      </div>
    );
  }

  const customers = live ? data.items : mockTopCustomers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate("/revenue-analysis")}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-display text-base font-semibold text-foreground">前五大客户</h3>
          {live && currentCompany?.name ? (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">{currentCompany.name}</Badge>
          ) : null}
      </div>
      <div className="space-y-3">
        {customers.map((customer, index) => (
          <div
            key={customer.name}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-accent/50 transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary font-display shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{customer.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">¥{customer.sales.toLocaleString()}万</span>
                <span className="text-xs text-muted-foreground">占比 {customer.percentage}%</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs shrink-0">
              {customer.trend === null || customer.trend === undefined ? (
                <span className="text-muted-foreground">单期</span>
              ) : (
                <>
                  {customer.trend > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-chart-3" />
                  ) : customer.trend < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  ) : null}
                  <span className={customer.trend > 0 ? "text-chart-3" : customer.trend < 0 ? "text-destructive" : "text-muted-foreground"}>
                    {customer.trend > 0 ? "+" : ""}{customer.trend}%
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default TopCustomers;
