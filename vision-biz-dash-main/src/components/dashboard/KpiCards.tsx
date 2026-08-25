import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, TrendingDown, Banknote, PiggyBank, BarChart3 } from "lucide-react";
import { fundBalance } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";

const formatCurrency = (value: number) => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return value.toLocaleString();
};

const KpiCards = () => {
  const navigate = useNavigate();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("fund");

  const { data } = useQuery({
    queryKey: ["dashboard", "fund-kpi", datasetId],
    queryFn: () => api.getFundKpi(datasetId),
    enabled: !!datasetId,
  });

  const live = !isDemo && data?.is_live_data;

  if (!isDemo && !live) {
    return (
      <div className="glass-card-glow p-5">
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="fund" domainLabel="资金" />
      </div>
    );
  }

  const source = live
    ? {
        total: data.total,
        bankDeposit: data.bank_deposit,
        cashOnHand: data.cash_on_hand,
        shortTermInvestment: data.short_term_investment,
        change: data.change,
      }
    : fundBalance;

  const cards = [
    { title: "资金余额", value: source.total, icon: Wallet, change: source.change, subtitle: "较上月" },
    { title: "银行存款", value: source.bankDeposit, icon: Banknote, change: 8.3, subtitle: "较上月" },
    { title: "短期投资", value: source.shortTermInvestment, icon: PiggyBank, change: 15.2, subtitle: "较上月" },
    { title: "现金及等价物", value: source.cashOnHand, icon: BarChart3, change: -2.1, subtitle: "较上月" },
  ];

  return (
    <div className="space-y-2">
      {live && currentCompany?.name ? (
        <Badge variant="secondary" className="text-[10px]">{currentCompany.name} · 资金</Badge>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="glass-card-glow p-5 group hover:border-primary/40 transition-all duration-300 cursor-pointer"
            onClick={() => navigate("/fund-analysis")}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="section-title text-xs">{card.title}</span>
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <card.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="kpi-value text-foreground mb-2">¥{formatCurrency(card.value)}</div>
            <div className="flex items-center gap-1.5 text-xs">
              {card.change > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-chart-3" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              )}
              <span className={card.change > 0 ? "text-chart-3" : "text-destructive"}>
                {card.change > 0 ? "+" : ""}{card.change}%
              </span>
              <span className="text-muted-foreground">{card.subtitle}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default KpiCards;
