import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Download, Save, Link2, BookmarkPlus, Search,
  ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp,
  GripVertical, Eye, EyeOff, RotateCcw, Play, Code2, Clock, Database,
  Copy, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  entities as mockEntities, currencies, expenseRanges as mockExpenseRanges, expenseSubjects as mockExpenseSubjects,
  departments, salesPersons, customers, projects, suppliers,
  generateDetailRows,
} from "@/data/expenseMockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import {
  filterExpenseRows,
  groupExpenseLiveRows,
  mapExpenseLiveRows,
  toExpenseDetailView,
  uniqueSorted,
} from "@/lib/liveQuery";

// ── Reusable MultiSelect ──
const MultiSelect = ({
  options, selected, onChange, placeholder, searchable = false,
}: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
  placeholder: string; searchable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = searchable ? options.filter(o => o.includes(search)) : options;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground min-w-[120px] max-w-[220px] truncate hover:border-primary/40 transition-colors"
      >
        {selected.length > 0
          ? `${selected[0]}${selected.length > 1 ? ` +${selected.length - 1}` : ""}`
          : <span className="text-muted-foreground">{placeholder}</span>}
        <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg p-2 max-h-60 overflow-auto">
            {searchable && (
              <Input
                placeholder="搜索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2 h-7 text-xs"
              />
            )}
            {filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted/50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => {
                    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
                  }}
                  className="rounded border-border accent-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Constants ──
const groupByOptions = [
  "部门", "销售人员", "客户", "项目", "供应商", "费用科目", "成本中心", "月份",
];

const metricDefs = [
  { key: "amount", label: "费用发生额", unit: "万" },
  { key: "expenseRate", label: "费用率", unit: "%" },
  { key: "yoy", label: "同比", unit: "%" },
  { key: "mom", label: "环比", unit: "%" },
  { key: "budgetDiff", label: "预算差异额", unit: "万" },
  { key: "budgetDiffRate", label: "预算差异率", unit: "%" },
  { key: "perCapita", label: "人均费用", unit: "万/人" },
  { key: "perCustomer", label: "客户均摊费用", unit: "万/客户" },
];

const granularityOptions = ["汇总数据", "明细数据", "汇总+明细"];

const detailColumns = [
  { key: "date", label: "发生日期" },
  { key: "entity", label: "主体" },
  { key: "department", label: "部门" },
  { key: "salesPerson", label: "销售人员" },
  { key: "customer", label: "客户" },
  { key: "project", label: "项目" },
  { key: "subject", label: "费用科目" },
  { key: "amount", label: "金额" },
  { key: "currency", label: "币种" },
  { key: "docNo", label: "单据号" },
  { key: "summary", label: "摘要" },
  { key: "supplier", label: "供应商" },
  { key: "status", label: "审批状态" },
];

// ── Mock data generation for grouped results ──
function generateGroupedData(groupBy: string[], metrics: string[]) {
  const sources: Record<string, string[]> = {
    "部门": departments,
    "销售人员": salesPersons,
    "客户": customers,
    "项目": projects,
    "供应商": suppliers,
    "费用科目": mockExpenseSubjects,
    "成本中心": ["CC-100", "CC-200", "CC-300", "CC-400", "CC-500"],
    "月份": ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"],
  };

  // Generate rows as cartesian product (limited)
  const primary = groupBy[0] || "部门";
  const items = sources[primary] || departments;
  const secondary = groupBy[1] ? (sources[groupBy[1]] || []).slice(0, 3) : [null];

  const rows: Record<string, any>[] = [];
  for (const item of items) {
    for (const sec of secondary) {
      const row: Record<string, any> = {};
      row[primary] = item;
      if (sec && groupBy[1]) row[groupBy[1]] = sec;

      // Fill metric columns
      if (metrics.includes("费用发生额")) row["费用发生额"] = Math.round(200 + Math.random() * 4800);
      if (metrics.includes("费用率")) row["费用率"] = Number((5 + Math.random() * 25).toFixed(1));
      if (metrics.includes("同比")) row["同比"] = Number((-20 + Math.random() * 40).toFixed(1));
      if (metrics.includes("环比")) row["环比"] = Number((-15 + Math.random() * 30).toFixed(1));
      if (metrics.includes("预算差异额")) row["预算差异额"] = Math.round(-500 + Math.random() * 1000);
      if (metrics.includes("预算差异率")) row["预算差异率"] = Number((-15 + Math.random() * 30).toFixed(1));
      if (metrics.includes("人均费用")) row["人均费用"] = Number((1 + Math.random() * 8).toFixed(1));
      if (metrics.includes("客户均摊费用")) row["客户均摊费用"] = Number((2 + Math.random() * 10).toFixed(1));

      rows.push(row);
    }
  }
  return rows;
}

function generateMockSQL(entity: string, groupBy: string[], metrics: string[]) {
  const metricCols = metrics.map(m => {
    if (m === "费用发生额") return "SUM(amount) AS expense_amount";
    if (m === "费用率") return "SUM(amount)/SUM(revenue)*100 AS expense_rate";
    if (m === "同比") return "YOY(amount) AS yoy";
    if (m === "环比") return "MOM(amount) AS mom";
    if (m === "预算差异额") return "SUM(amount)-SUM(budget) AS budget_diff";
    if (m === "预算差异率") return "(SUM(amount)-SUM(budget))/SUM(budget)*100 AS budget_diff_rate";
    if (m === "人均费用") return "SUM(amount)/COUNT(DISTINCT emp_id) AS per_capita";
    if (m === "客户均摊费用") return "SUM(amount)/COUNT(DISTINCT customer_id) AS per_customer";
    return m;
  });
  const groupCols = groupBy.join(", ");
  return `SELECT ${groupCols ? groupCols + ", " : ""}
  ${metricCols.join(",\n  ")}
FROM dw_expense_fact
WHERE entity = '${entity}'
  AND period BETWEEN '2024-07' AND '2025-06'
${groupCols ? `GROUP BY ${groupCols}` : ""}
ORDER BY expense_amount DESC
LIMIT 500;`;
}

// ── Main Component ──
const ExpenseAnalysis = () => {
  const navigate = useNavigate();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("expense");

  const { data: liveDataset } = useQuery({
    queryKey: ["analysis-expense-rows", datasetId],
    queryFn: () => api.getDataset(datasetId!, 5000),
    enabled: Boolean(datasetId) && !isDemo,
  });

  const liveRows = useMemo(
    () => (liveDataset?.preview_rows?.length ? mapExpenseLiveRows(liveDataset.preview_rows as Record<string, unknown>[]) : null),
    [liveDataset],
  );
  const usingLive = Boolean(liveRows?.length);

  const entityOptions = useMemo(() => {
    if (!usingLive || !liveRows) return mockEntities;
    return ["全部", ...uniqueSorted(liveRows.map(row => row.entity))];
  }, [usingLive, liveRows]);
  const rangeOptions = useMemo(() => {
    if (!usingLive || !liveRows) return mockExpenseRanges;
    return uniqueSorted(liveRows.map(row => row.category));
  }, [usingLive, liveRows]);
  const subjectOptions = useMemo(() => {
    if (!usingLive || !liveRows) return mockExpenseSubjects;
    return uniqueSorted(liveRows.map(row => row.subject));
  }, [usingLive, liveRows]);

  // Filter states
  const [entity, setEntity] = useState("集团");
  const [currency, setCurrency] = useState("本位币");
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [periodStart, setPeriodStart] = useState("2024-07");
  const [periodEnd, setPeriodEnd] = useState("2025-06");

  useEffect(() => {
    if (!usingLive || !liveRows) {
      setEntity("集团");
      setSelectedRanges(["销售费用", "管理费用", "研发费用"]);
      return;
    }
    setEntity(entityOptions[0] ?? "全部");
    setSelectedRanges(rangeOptions);
    const months = uniqueSorted(liveRows.map(row => row.date.slice(0, 7)).filter(Boolean));
    if (months.length) {
      setPeriodStart(months[0]);
      setPeriodEnd(months[months.length - 1]);
    }
  }, [usingLive, liveRows, entityOptions, rangeOptions]);

  // Query builder states
  const [groupBy, setGroupBy] = useState<string[]>(["部门", "费用科目"]);
  const [selectedMetrics, setSelectedMetrics] = useState(["费用发生额", "费用率", "同比"]);
  const [granularity, setGranularity] = useState("汇总数据");

  // Result states
  const [hasQueried, setHasQueried] = useState(false);
  const [queryTime, setQueryTime] = useState("");
  const [sqlOpen, setSqlOpen] = useState(false);

  // Table states
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [colSettingsOpen, setColSettingsOpen] = useState(false);

  // Drawer
  const [drawerRow, setDrawerRow] = useState<any>(null);

  // Data
  const filteredLive = useMemo(() => {
    if (!usingLive || !liveRows) return [];
    return filterExpenseRows(liveRows, {
      entity,
      categories: selectedRanges,
      subjects: selectedSubjects,
      periodStart,
      periodEnd,
    });
  }, [usingLive, liveRows, entity, selectedRanges, selectedSubjects, periodStart, periodEnd]);

  const detailRows = useMemo(() => {
    if (usingLive) return toExpenseDetailView(filteredLive);
    return generateDetailRows(80);
  }, [usingLive, filteredLive, entity]);

  const groupedData = useMemo(() => {
    if (usingLive) return groupExpenseLiveRows(filteredLive, groupBy, selectedMetrics);
    return generateGroupedData(groupBy, selectedMetrics);
  }, [usingLive, filteredLive, groupBy, selectedMetrics, entity]);

  const isDetail = granularity === "明细数据";
  const isBoth = granularity === "汇总+明细";

  // Columns for grouped table
  const groupedColumns = useMemo(() => {
    const cols = [...groupBy, ...selectedMetrics];
    return cols.filter(c => !hiddenCols.includes(c));
  }, [groupBy, selectedMetrics, hiddenCols]);

  const allColumns = useMemo(() => [...groupBy, ...selectedMetrics], [groupBy, selectedMetrics]);

  // Sort & filter grouped data
  const processedGrouped = useMemo(() => {
    let data = [...groupedData];
    if (tableSearch) {
      data = data.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(tableSearch.toLowerCase()))
      );
    }
    if (sortKey) {
      data.sort((a, b) => {
        const va = a[sortKey] ?? 0;
        const vb = b[sortKey] ?? 0;
        return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
    }
    return data;
  }, [groupedData, tableSearch, sortKey, sortDir]);

  // Sort & filter detail data
  const processedDetail = useMemo(() => {
    let data = [...detailRows];
    if (tableSearch) {
      data = data.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(tableSearch.toLowerCase()))
      );
    }
    return data;
  }, [detailRows, tableSearch]);

  const pageSize = 20;

  const currentData = isDetail ? processedDetail : processedGrouped;
  const totalPages = Math.ceil(currentData.length / pageSize);
  const pagedData = currentData.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  const mockSql = useMemo(
    () => generateMockSQL(entity, groupBy, selectedMetrics),
    [entity, groupBy, selectedMetrics]
  );

  const handleQuery = () => {
    if (!isDemo && !usingLive) {
      toast.error("当前公司尚未入库费用数据，请先在 Campaign 上传费用 CSV");
      return;
    }
    setHasQueried(true);
    setTablePage(1);
    setQueryTime(new Date().toLocaleString("zh-CN"));
    toast.success("查询完成", {
      description: usingLive
        ? `「${currentCompany?.name ?? "当前公司"}」共返回 ${currentData.length} 条`
        : `演示数据共返回 ${currentData.length} 条`,
    });
  };

  const handleReset = () => {
    setCurrency("本位币");
    setSelectedSubjects([]);
    setGroupBy(["部门", "费用科目"]);
    setSelectedMetrics(["费用发生额", "费用率", "同比"]);
    setGranularity("汇总数据");
    setHasQueried(false);
    setTableSearch("");
    setHiddenCols([]);
    setSortKey(null);
    if (usingLive && liveRows) {
      setEntity(entityOptions[0] ?? "全部");
      setSelectedRanges(rangeOptions);
      const months = uniqueSorted(liveRows.map(row => row.date.slice(0, 7)).filter(Boolean));
      if (months.length) {
        setPeriodStart(months[0]);
        setPeriodEnd(months[months.length - 1]);
      }
    } else {
      setEntity("集团");
      setSelectedRanges(["销售费用", "管理费用", "研发费用"]);
      setPeriodStart("2024-07");
      setPeriodEnd("2025-06");
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleCol = (col: string) => {
    setHiddenCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-foreground">费用数据自助查询平台</h1>
                <Badge variant="secondary" className="text-[10px]">
                  {usingLive ? (currentCompany?.name ?? "已上传数据") : "演示数据"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {usingLive
                  ? `基于「${currentCompany?.name ?? "当前公司"}」已入库费用数据查询`
                  : "Query Builder · 结构化数据查询与导出（演示）"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.info("查询模板已保存")}>
              <Save className="w-3.5 h-3.5" /> 保存查询模板
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <BookmarkPlus className="w-3.5 h-3.5" /> 我的模板
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>我的查询模板</DialogTitle></DialogHeader>
                <div className="space-y-2 py-2">
                  {["月度部门费用汇总", "研发费用明细导出", "客户费用分摊报表", "预算执行差异分析"].map(t => (
                    <div key={t} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                      <span className="text-sm text-foreground">{t}</span>
                      <Button variant="ghost" size="sm" className="text-xs">加载</Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.info("Excel导出中...")}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> 导出Excel
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
              navigator.clipboard?.writeText("https://example.com/vision-insight/query/q=demo");
              toast.success("查询链接已复制");
            }}>
              <Link2 className="w-3.5 h-3.5" /> 复制链接
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* ── Query Builder ── */}
        <div className="glass-card p-5 space-y-4">
          {/* Row 1: Base Filters */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">基础筛选</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">期间</span>
                <Input type="month" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-[130px] h-8 text-xs" />
                <span className="text-xs text-muted-foreground">至</span>
                <Input type="month" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-[130px] h-8 text-xs" />
              </div>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{entityOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <MultiSelect options={rangeOptions} selected={selectedRanges} onChange={setSelectedRanges} placeholder="费用范围" />
              <MultiSelect options={subjectOptions} selected={selectedSubjects} onChange={setSelectedSubjects} placeholder="费用科目" searchable />
            </div>
          </div>

          {/* Row 2: Group By + Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">分组维度（Group By）</div>
              <div className="flex flex-wrap gap-1.5">
                {groupByOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setGroupBy(prev => prev.includes(opt) ? prev.filter(g => g !== opt) : [...prev, opt]);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      groupBy.includes(opt)
                        ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {groupBy.includes(opt) && <span className="mr-1 text-[10px] text-muted-foreground">{groupBy.indexOf(opt) + 1}</span>}
                    {opt}
                  </button>
                ))}
              </div>
              {groupBy.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <GripVertical className="w-3 h-3" /> 输出列顺序：{groupBy.join(" → ")}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">指标选择（Metrics）</div>
              <div className="flex flex-wrap gap-1.5">
                {metricDefs.map(m => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setSelectedMetrics(prev =>
                        prev.includes(m.label) ? prev.filter(x => x !== m.label) : [...prev, m.label]
                      );
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedMetrics.includes(m.label)
                        ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {m.label}
                    <span className="ml-1 text-[10px] text-muted-foreground">({m.unit})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Granularity + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">数据粒度</span>
              {granularityOptions.map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    granularity === g
                      ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" /> 重置
              </Button>
              <Button size="sm" className="text-xs gap-1.5" onClick={handleQuery}>
                <Play className="w-3.5 h-3.5" /> 生成数据
              </Button>
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        {hasQueried && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Query Summary */}
            <div className="glass-card p-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  查询时间：{queryTime}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Database className="w-3.5 h-3.5" />
                  返回 <span className="font-semibold text-foreground">{currentData.length}</span> 条数据
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">{entity}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{currency}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{periodStart} ~ {periodEnd}</Badge>
                  {selectedRanges.map(r => (
                    <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                  ))}
                </div>
              </div>

              {/* SQL Preview */}
              <Collapsible open={sqlOpen} onOpenChange={setSqlOpen}>
                <CollapsibleTrigger asChild>
                  <button className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Code2 className="w-3.5 h-3.5" />
                    SQL 预览
                    {sqlOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-[11px] text-muted-foreground overflow-x-auto font-mono whitespace-pre">
                    {mockSql}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Data Table */}
            <div className="glass-card">
              {/* Table Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索数据..."
                      value={tableSearch}
                      onChange={e => { setTableSearch(e.target.value); setTablePage(1); }}
                      className="pl-8 h-8 w-[200px] text-xs"
                    />
                  </div>
                  <Dialog open={colSettingsOpen} onOpenChange={setColSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Eye className="w-3.5 h-3.5" /> 列设置
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>显示/隐藏列</DialogTitle></DialogHeader>
                      <div className="space-y-1 max-h-[300px] overflow-auto">
                        {(isDetail ? detailColumns.map(c => c.label) : allColumns).map(col => (
                          <label key={col} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!hiddenCols.includes(col)}
                              onChange={() => toggleCol(col)}
                              className="rounded accent-primary"
                            />
                            <span className="text-sm">{col}</span>
                          </label>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="text-xs text-muted-foreground">
                  第 {tablePage}/{totalPages} 页 · 共 {currentData.length} 条
                </div>
              </div>

              {/* Grouped / Summary Table */}
              {(!isDetail || isBoth) && (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {groupedColumns.map(col => (
                          <TableHead
                            key={col}
                            className="text-xs font-semibold cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                            onClick={() => handleSort(col)}
                          >
                            <span className="flex items-center gap-1">
                              {col}
                              {sortKey === col && (
                                sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                              )}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(isDetail ? [] : pagedData).map((row: any, i: number) => (
                        <TableRow
                          key={i}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => setDrawerRow(row)}
                        >
                          {groupedColumns.map(col => (
                            <TableCell key={col} className="text-xs whitespace-nowrap py-2.5">
                              {typeof row[col] === "number"
                                ? (col.includes("率") || col === "同比" || col === "环比"
                                  ? `${row[col]}%`
                                  : row[col].toLocaleString())
                                : row[col]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Detail Table */}
              {(isDetail || isBoth) && (
                <>
                  {isBoth && (
                    <div className="px-4 pt-4 pb-2 border-t border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">明细数据</span>
                    </div>
                  )}
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {detailColumns.filter(c => !hiddenCols.includes(c.label)).map(col => (
                            <TableHead key={col.key} className="text-xs font-semibold whitespace-nowrap">
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(isDetail ? pagedData : processedDetail.slice(0, 20)).map((row: any, i: number) => (
                          <TableRow
                            key={i}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => setDrawerRow(row)}
                          >
                            {detailColumns.filter(c => !hiddenCols.includes(c.label)).map(col => (
                              <TableCell key={col.key} className="text-xs whitespace-nowrap py-2.5">
                                {col.key === "amount"
                                  ? `¥${(row[col.key] as number).toLocaleString()}`
                                  : col.key === "status"
                                    ? <Badge variant={row.status === "已审批" ? "default" : row.status === "已驳回" ? "destructive" : "secondary"} className="text-[10px]">{row.status}</Badge>
                                    : row[col.key]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => toast.info("Excel导出中...")}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> 导出Excel
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => toast.info("已保存为常用查询")}>
                    <Save className="w-3.5 h-3.5" /> 保存为常用查询
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
                    navigator.clipboard?.writeText("QUERY-ID-20250615-001");
                    toast.success("查询ID已复制");
                  }}>
                    <Copy className="w-3.5 h-3.5" /> 复制查询ID
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={tablePage <= 1}
                    onClick={() => setTablePage(p => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">{tablePage} / {totalPages}</span>
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={tablePage >= totalPages}
                    onClick={() => setTablePage(p => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!hasQueried && (
          <div className="glass-card p-16 text-center">
            <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">选择查询条件</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              配置上方的筛选条件、分组维度和指标，点击"生成数据"查看结构化查询结果。
            </p>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!drawerRow} onOpenChange={(open) => { if (!open) setDrawerRow(null); }}>
        <SheetContent className="w-[420px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle className="text-base">数据详情</SheetTitle>
          </SheetHeader>
          {drawerRow && (
            <div className="mt-4 space-y-3">
              {Object.entries(drawerRow).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{key}</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[240px]">
                    {typeof value === "number" ? value.toLocaleString() : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ExpenseAnalysis;
