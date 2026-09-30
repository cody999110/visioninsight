import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  CircleDollarSign, Percent, Receipt, TrendingDown, TrendingUp, WalletCards,
} from "lucide-react";
import { mockOpsKpiByYear } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { colorsForYears } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";
import YearChips from "@/components/dashboard/YearChips";
import { useMultiYearSelection } from "@/components/dashboard/useMultiYearSelection";
import { DASHBOARD_YEARS } from "@/components/dashboard/chartTheme";
import { formatPct, formatWan, formatYoy, yoyClass } from "@/components/management/format";
import { useTheme } from "@/contexts/ThemeContext";

export default function OpsKpiCards() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isDemo, currentCompany } = useDataSource();
  const company = currentCompany?.name;
  const { selectedYears, toggleYear, syncAvailable, primaryYear, compareYear, isCompare } =
    useMultiYearSelection(["2024", "2025"]);

  const yearColors = useMemo(() => colorsForYears(selectedYears), [theme, selectedYears.join(",")]);
  const queries = useQueries({
    queries: selectedYears.map(year => ({
      queryKey: ["dashboard", "ops-kpi", company, year],
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

  const primaryLive = !isDemo && queries.find((_, i) => selectedYears[i] === primaryYear)?.data?.is_live_data
    && String(queries.find((_, i) => selectedYears[i] === primaryYear)?.data?.year) === primaryYear;

  const pickSource = (year: string) => {
    const idx = selectedYears.indexOf(year);
    const data = idx >= 0 ? queries[idx]?.data : undefined;
    const live = !isDemo && data?.is_live_data && String(data.year) === year;
    if (live) {
      return {
        revenue: data.kpis.revenue,
        revenueYoy: data.kpis.revenue_yoy,
        grossProfit: data.kpis.gross_profit,
        grossMargin: data.kpis.gross_margin,
        expense: data.kpis.expense,
        hasExpense: data.has_expense,
      };
    }
    const mock = mockOpsKpiByYear[year] ?? mockOpsKpiByYear["2025"];
    return { ...mock, hasExpense: true, revenueYoy: mock.revenueYoy as number | null };
  };

  const primary = pickSource(primaryYear);
  const compare = compareYear ? pickSource(compareYear) : null;

  const computedYoy =
    compare && compare.revenue
      ? ((primary.revenue - compare.revenue) / compare.revenue) * 100
      : primary.revenueYoy ?? null;

  const cards = [
    {
      title: "营业收入",
      value: `¥${formatWan(primary.revenue)}万`,
      hint: isCompare && compareYear
        ? `较 ${compareYear} ${formatYoy(computedYoy)}`
        : formatYoy(computedYoy),
      hintClass: yoyClass(computedYoy),
      icon: CircleDollarSign,
      showTrend: true,
      up: (computedYoy ?? 0) >= 0,
      sub: isCompare && compare ? `${compareYear}: ¥${formatWan(compare.revenue)}万` : null,
    },
    {
      title: "毛利额",
      value: `¥${formatWan(primary.grossProfit)}万`,
      hint: isCompare && compare
        ? `较 ${compareYear} ${formatYoy(
            compare.grossProfit ? ((primary.grossProfit - compare.grossProfit) / compare.grossProfit) * 100 : null,
          )}`
        : `${primaryYear} 年累计`,
      hintClass: "text-muted-foreground",
      icon: WalletCards,
      showTrend: false,
      up: true,
      sub: isCompare && compare ? `${compareYear}: ¥${formatWan(compare.grossProfit)}万` : null,
    },
    {
      title: "毛利率",
      value: formatPct(primary.grossMargin),
      hint: isCompare && compare
        ? `${compareYear} ${formatPct(compare.grossMargin)}`
        : "综合毛利率",
      hintClass: "text-muted-foreground",
      icon: Percent,
      showTrend: false,
      up: true,
      sub: null,
    },
    {
      title: "费用合计",
      value: `¥${formatWan(primary.expense)}万`,
      hint: isCompare && compare
        ? `较 ${compareYear} ${formatYoy(
            compare.expense ? ((primary.expense - compare.expense) / compare.expense) * 100 : null,
          )}`
        : primary.hasExpense === false
          ? "暂无费用数据"
          : `${primaryYear} 年归集`,
      hintClass: "text-muted-foreground",
      icon: Receipt,
      showTrend: false,
      up: false,
      sub: isCompare && compare ? `${compareYear}: ¥${formatWan(compare.expense)}万` : null,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="section-title text-xs">经营概览</span>
          <Badge variant="secondary" className="text-[10px]">
            {isDemo || !primaryLive ? "演示" : company}
            {isCompare ? ` · ${compareYear} vs ${primaryYear}` : ` · ${primaryYear}`}
          </Badge>
        </div>
        <YearChips
          multi
          years={yearOptions}
          values={selectedYears}
          onToggle={toggleYear}
          colors={Object.fromEntries(selectedYears.map(y => [y, yearColors[y]?.solid ?? ""]))}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={`${primaryYear}-${compareYear ?? "x"}-${card.title}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
            className="glass-card-glow p-5 group hover:border-primary/40 transition-all duration-300 cursor-pointer"
            onClick={() => navigate(isDemo ? "/management/charts" : "/management/report")}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="section-title text-xs">{card.title}</span>
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <card.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="kpi-value text-foreground mb-2 text-2xl md:text-3xl">{card.value}</div>
            <div className={`flex items-center gap-1.5 text-xs ${card.hintClass}`}>
              {card.showTrend ? (
                card.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />
              ) : null}
              <span>{card.hint}</span>
            </div>
            {card.sub ? <div className="text-[11px] text-muted-foreground mt-1.5">{card.sub}</div> : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
