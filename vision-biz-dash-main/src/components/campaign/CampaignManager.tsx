import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Check, Download, Eye, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  api,
  type CleaningPreviewResponse,
  type DatasetDetail,
  type DatasetSummary,
  type Domain,
  type ImportTemplateSummary,
} from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { cn } from "@/lib/utils";

const DOMAIN_LABELS: Record<Domain, string> = {
  expense: "费用",
  revenue: "收入成本",
  fund: "资金",
};

const DOMAINS: Domain[] = ["revenue", "expense", "fund"];

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function CampaignManager() {
  const {
    companies,
    refreshCompanies,
    selectView,
    campaignOpen: open,
    setCampaignOpen: setOpen,
    campaignPreset,
  } = useDataSource();
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState<Domain>("revenue");
  const [templates, setTemplates] = useState<ImportTemplateSummary[]>([]);
  const [templateCode, setTemplateCode] = useState("");
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [step, setStep] = useState<"create" | "upload" | "confirm" | "done" | "preview">("create");
  const [datasetSummaries, setDatasetSummaries] = useState<DatasetSummary[]>([]);
  const [preview, setPreview] = useState<DatasetDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cleaningPreview, setCleaningPreview] = useState<CleaningPreviewResponse | null>(null);

  const summariesById = useMemo(() => {
    const map = new Map<string, DatasetSummary>();
    for (const item of datasetSummaries) map.set(item.id, item);
    return map;
  }, [datasetSummaries]);

  const campaignCompanies = useMemo(() => {
    const byName = new Map<
      string,
      { name: string; datasets: Partial<Record<Domain, DatasetSummary>> }
    >();
    for (const item of datasetSummaries) {
      if (!["validated", "active", "pending_confirm"].includes(item.status)) continue;
      const entry = byName.get(item.company) ?? { name: item.company, datasets: {} };
      const existing = entry.datasets[item.domain];
      // Prefer usable over pending when duplicates exist.
      if (!existing || existing.status === "pending_confirm" || item.status !== "pending_confirm") {
        entry.datasets[item.domain] = item;
      }
      byName.set(item.company, entry);
    }
    // Ensure companies already in switcher still appear even if listDatasets lags.
    for (const company of companies) {
      if (byName.has(company.name)) continue;
      const datasets: Partial<Record<Domain, DatasetSummary>> = {};
      for (const d of DOMAINS) {
        const id = company.datasets[d];
        if (!id) continue;
        datasets[d] = summariesById.get(id) ?? {
          id,
          name: `${company.name} · ${DOMAIN_LABELS[d]}`,
          company: company.name,
          domain: d,
          template_code: "",
          status: "validated",
          row_count: 0,
          error_count: 0,
          data_as_of: company.data_as_of,
          created_at: "",
          activated_at: null,
        };
      }
      byName.set(company.name, { name: company.name, datasets });
    }
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "zh"));
  }, [datasetSummaries, companies, summariesById]);

  const findExistingDataset = (companyName: string, domainValue: Domain) => {
    const fromCampaign = campaignCompanies.find(item => item.name === companyName)?.datasets[domainValue];
    if (fromCampaign) return fromCampaign;
    const id = companies.find(item => item.name === companyName)?.datasets[domainValue];
    return id ? summariesById.get(id) ?? null : null;
  };

  const refreshDatasetSummaries = async () => {
    try {
      const res = await api.listDatasets();
      setDatasetSummaries(res.items);
    } catch {
      setDatasetSummaries([]);
    }
  };

  const openConfirmStep = async (id: string, companyName: string, domainValue: Domain) => {
    setCompany(companyName);
    setDomain(domainValue);
    setDatasetId(id);
    setUpdating(true);
    setStep("confirm");
    try {
      setCleaningPreview(await api.getCleaningPreview(id, 40));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载清洗预览失败");
      setStep("create");
    }
  };

  useEffect(() => {
    if (!open) return;
    api.listTemplates(domain).then(res => {
      setTemplates(res.items);
      setTemplateCode(res.items[0]?.code ?? "");
    });
  }, [open, domain]);

  useEffect(() => {
    if (!open) return;
    void refreshDatasetSummaries();
  }, [open, companies]);

  useEffect(() => {
    if (!open || !campaignPreset) return;
    if (campaignPreset.company) setCompany(campaignPreset.company);
    if (campaignPreset.domain) setDomain(campaignPreset.domain);
    setDatasetId(null);
    setUpdating(false);
    setPreview(null);
    setCleaningPreview(null);
    setStep("create");
  }, [open, campaignPreset]);

  const resetForm = () => {
    setCompany("");
    setDomain("revenue");
    setDatasetId(null);
    setUpdating(false);
    setPreview(null);
    setCleaningPreview(null);
    setStep("create");
  };

  const startUpdate = (id: string, companyName: string, domainValue: Domain) => {
    setCompany(companyName);
    setDomain(domainValue);
    setDatasetId(id);
    setUpdating(true);
    setPreview(null);
    setCleaningPreview(null);
    setStep("upload");
  };

  const openPreview = async (id: string, companyName: string, domainValue: Domain) => {
    setCompany(companyName);
    setDomain(domainValue);
    setDatasetId(id);
    setUpdating(true);
    setStep("preview");
    setPreviewLoading(true);
    try {
      setPreview(await api.getDataset(id, 80));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载数据失败");
      setStep("create");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!company.trim() || !templateCode) {
      toast.error("请填写公司名称并选择模板");
      return;
    }
    const existing = findExistingDataset(company.trim(), domain);
    if (existing) {
      if (existing.status === "pending_confirm") {
        void openConfirmStep(existing.id, company.trim(), domain);
        toast.info("该公司该数据域有待确认的清洗结果，请先确认入库。");
        return;
      }
      startUpdate(existing.id, company.trim(), domain);
      toast.info("该公司该数据域已有数据，上传将覆盖现有记录。建议先下载再修改。");
      return;
    }
    try {
      const name = `${company.trim()} · ${DOMAIN_LABELS[domain]}`;
      const dataset = await api.createDataset({
        name,
        company: company.trim(),
        domain,
        template_code: templateCode,
      });
      setDatasetId(dataset.id);
      setUpdating(false);
      setStep("upload");
      toast.success("已创建，请上传 CSV 文件");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  const handleUpload = async (file: File) => {
    if (!datasetId) return;
    setUploading(true);
    try {
      const result = await api.uploadDataset(datasetId, file, false);
      if (result.status === "failed" || (result.error_rows > 0 && result.success_rows === 0)) {
        toast.error(`校验未通过：${result.errors[0] ?? "请检查 CSV 格式"}`);
        return;
      }
      if (result.needs_confirm || result.status === "pending_confirm") {
        const previewData = await api.getCleaningPreview(datasetId, 40);
        setCleaningPreview(previewData);
        setStep("confirm");
        toast.success("上传完成，请确认清洗结果后入库");
        return;
      }
      if (result.can_activate) {
        await refreshCompanies();
        selectView(company.trim());
        setStep("done");
        toast.success(
          updating
            ? `已覆盖更新「${company.trim()}」的${DOMAIN_LABELS[domain]}数据`
            : `已上传，顶部数据视图已切换到「${company.trim()}」`,
        );
      } else {
        toast.error(`校验未通过：${result.errors[0] ?? "请检查 CSV 格式"}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!datasetId) return;
    setConfirming(true);
    try {
      const result = await api.confirmDataset(datasetId);
      if (result.status !== "validated" && result.status !== "active") {
        toast.error(result.message || "确认入库失败");
        return;
      }
      await refreshCompanies();
      await refreshDatasetSummaries();
      selectView(company.trim());
      setCleaningPreview(null);
      setStep("done");
      toast.success(
        updating
          ? `已确认并覆盖「${company.trim()}」的${DOMAIN_LABELS[domain]}数据`
          : `已确认入库，顶部数据视图已切换到「${company.trim()}」`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "确认入库失败");
    } finally {
      setConfirming(false);
    }
  };

  const wideDialog = step === "preview" || step === "confirm";

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <DialogContent
        className={cn(
          "flex flex-col gap-3 overflow-hidden",
          wideDialog
            ? "w-[min(56rem,calc(100vw-1.5rem))] !max-w-[min(56rem,calc(100vw-1.5rem))] max-h-[90vh] p-4 sm:p-5"
            : "max-w-lg",
        )}
      >
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>Campaign 数据管理（按公司）</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden">
          {campaignCompanies.length > 0 && step !== "preview" && step !== "confirm" && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground">已上传公司</div>
              {campaignCompanies.map(item => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    {item.name}
                  </div>
                  {DOMAINS.filter(d => item.datasets[d]).map(d => {
                    const meta = item.datasets[d]!;
                    const pending = meta.status === "pending_confirm";
                    return (
                      <div key={d} className="flex items-center justify-between gap-2 pl-5">
                        <div className="min-w-0 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] shrink-0">{DOMAIN_LABELS[d]}</Badge>
                          {pending ? (
                            <Badge variant="outline" className="text-[10px] shrink-0 text-amber-700 border-amber-300">
                              待确认
                            </Badge>
                          ) : null}
                          <span className="text-[11px] text-muted-foreground truncate">
                            {meta.row_count ? `${meta.row_count} 行` : pending ? "待确认入库" : "已上传"}
                            {meta.data_as_of ? ` · 截至 ${meta.data_as_of}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center shrink-0">
                          {pending ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1"
                              onClick={() => void openConfirmStep(meta.id, item.name, d)}
                            >
                              <Check className="w-3 h-3" /> 继续确认
                            </Button>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1"
                                onClick={() => void openPreview(meta.id, item.name, d)}
                              >
                                <Eye className="w-3 h-3" /> 查看
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" asChild>
                                <a href={api.downloadDataset(meta.id)} download>
                                  <Download className="w-3 h-3" /> 下载
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1"
                                onClick={() => startUpdate(meta.id, item.name, d)}
                              >
                                <Upload className="w-3 h-3" /> 更新
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground pt-1">
                可下载已有 CSV 修改后点「更新」覆盖上传；待确认的数据需先点「继续确认」入库后才会出现在左上角公司列表。
              </p>
            </div>
          )}

          {step === "create" && (
            <div className="space-y-3">
              <Input
                placeholder="公司名称，例如：ABC 公司"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <Select value={domain} onValueChange={(value: Domain) => setDomain(value)}>
                <SelectTrigger><SelectValue placeholder="选择数据域" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">收入成本</SelectItem>
                  <SelectItem value="expense">费用</SelectItem>
                  <SelectItem value="fund">资金</SelectItem>
                </SelectContent>
              </Select>
              <Select value={templateCode} onValueChange={setTemplateCode}>
                <SelectTrigger><SelectValue placeholder="选择模板" /></SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.code} value={template.code}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateCode && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={api.downloadTemplate(templateCode)} download>
                    <Download className="w-3.5 h-3.5" /> 下载 CSV 模板
                  </a>
                </Button>
              )}
              <Button className="w-full gap-1.5" onClick={handleCreate}>
                <Zap className="w-3.5 h-3.5" /> 创建并进入上传
              </Button>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-3">
              {updating ? (
                <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                  <p className="text-sm">
                    正在更新「{company.trim()}」的<strong>{DOMAIN_LABELS[domain]}</strong>数据，上传将覆盖现有记录。
                  </p>
                  <p className="text-xs text-muted-foreground">
                    请务必上传「{DOMAIN_LABELS[domain]}」模板 CSV（第 1 行英文字段名）。传错数据域会导致校验失败；失败不会再清掉已有成功数据。
                  </p>
                  {datasetId && (
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <a href={api.downloadDataset(datasetId)} download>
                        <Download className="w-3.5 h-3.5" /> 下载当前数据
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  当前上传数据域：<strong>{DOMAIN_LABELS[domain]}</strong>。请上传对应模板的 CSV（第 1 行英文字段名、第 2 行中文表头，从第 3 行开始填数据）。上传后会预览清洗结果，确认后才入库。
                </p>
              )}
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 cursor-pointer hover:bg-muted/40">
                <Upload className="w-5 h-5 text-primary" />
                <span className="text-sm">{uploading ? "上传中..." : "点击选择 CSV 文件"}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleUpload(file);
                  }}
                />
              </label>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setUpdating(false); setDatasetId(null); setStep("create"); }}>
                <ArrowLeft className="w-3.5 h-3.5" /> 返回
              </Button>
            </div>
          )}

          {step === "confirm" && cleaningPreview && (
            <div className="min-w-0 space-y-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{company} · {DOMAIN_LABELS[domain]} · 清洗预览</p>
                <p className="text-xs text-muted-foreground">
                  有效 {cleaningPreview.summary.success_rows} 行 · 映射 {cleaningPreview.summary.mapped_cells} 格 · 变更行 {cleaningPreview.summary.changed_rows}
                  {cleaningPreview.summary.error_rows > 0 ? ` · 校验错误 ${cleaningPreview.summary.error_rows}` : ""}
                </p>
              </div>

              {cleaningPreview.summary.warnings.length > 0 && (
                <div className="space-y-1 break-words rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {cleaningPreview.summary.warnings.map(item => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              )}

              {cleaningPreview.summary.field_changes.length > 0 && (
                <div className="max-h-28 w-full min-w-0 overflow-auto rounded-lg border border-border">
                  <table className="w-max min-w-full text-xs">
                    <thead className="sticky top-0 z-[1] bg-muted">
                      <tr>
                        <th className="whitespace-nowrap border-b px-2 py-1.5 text-left">字段</th>
                        <th className="whitespace-nowrap border-b px-2 py-1.5 text-left">原值</th>
                        <th className="whitespace-nowrap border-b px-2 py-1.5 text-left">映射后</th>
                        <th className="whitespace-nowrap border-b px-2 py-1.5 text-right">次数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cleaningPreview.summary.field_changes.slice(0, 30).map((item, index) => (
                        <tr key={`${item.field}-${item.before}-${index}`} className="border-b last:border-0">
                          <td className="whitespace-nowrap px-2 py-1">{item.field}</td>
                          <td className="whitespace-nowrap px-2 py-1">{item.before}</td>
                          <td className="whitespace-nowrap px-2 py-1">{item.after}</td>
                          <td className="whitespace-nowrap px-2 py-1 text-right">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="h-[min(22rem,45vh)] w-full min-w-0 overflow-auto rounded-lg border border-border bg-background">
                {cleaningPreview.cleaned_preview.length > 0 ? (
                  <table className="w-max min-w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-[1] bg-muted">
                      <tr>
                        {(cleaningPreview.columns.length
                          ? cleaningPreview.columns
                          : Object.keys(cleaningPreview.cleaned_preview[0]).map(key => ({ key, label: key }))
                        ).map(col => (
                          <th key={col.key} className="whitespace-nowrap border-b px-2 py-2 text-left font-medium text-muted-foreground">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cleaningPreview.cleaned_preview.map((row, index) => (
                        <tr key={index} className="border-b last:border-0">
                          {(cleaningPreview.columns.length
                            ? cleaningPreview.columns.map(col => col.key)
                            : Object.keys(row)
                          ).map(key => (
                            <td key={key} className="whitespace-nowrap px-2 py-1.5 text-foreground/90">
                              {formatCell(row[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-6 text-center text-sm text-muted-foreground">没有可预览的清洗结果</p>
                )}
              </div>

              {cleaningPreview.errors.length > 0 && (
                <div className="space-y-1 break-words text-xs text-destructive">
                  {cleaningPreview.errors.slice(0, 5).map(item => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "preview" && (
            <div className="min-w-0 space-y-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">
                  {company} · {DOMAIN_LABELS[domain]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {previewLoading
                    ? "加载中..."
                    : preview
                      ? `共 ${preview.row_count} 行，预览前 ${preview.preview_rows.length} 行。下载后可修改再点「更新」覆盖。`
                      : "暂无预览"}
                </p>
              </div>
              <div className="h-[min(24rem,50vh)] w-full min-w-0 overflow-auto rounded-lg border border-border bg-background">
                {preview && preview.preview_rows.length > 0 ? (
                  <table className="w-max min-w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-[1] bg-muted">
                      <tr>
                        {(preview.columns.length ? preview.columns : Object.keys(preview.preview_rows[0]).map(key => ({ key, label: key }))).map(col => (
                          <th key={col.key} className="whitespace-nowrap border-b px-2 py-2 text-left font-medium text-muted-foreground">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview_rows.map((row, index) => (
                        <tr key={index} className="border-b last:border-0">
                          {(preview.columns.length ? preview.columns.map(col => col.key) : Object.keys(row)).map(key => (
                            <td key={key} className="whitespace-nowrap px-2 py-1.5 text-foreground/90">
                              {formatCell(row[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  !previewLoading && <p className="p-6 text-center text-sm text-muted-foreground">没有可预览的数据行</p>
                )}
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-4 text-sm">
                {updating ? "覆盖更新成功" : "上传成功"}。顶部「数据视图」已切换到「{company.trim()}」，看板仅展示该公司数据；
                切回「演示数据（示例公司）」即可查看示例数据。之后可随时在上方下载或再次更新。
              </div>
              <Button variant="outline" className="w-full" onClick={resetForm}>
                继续为其它公司/数据域上传
              </Button>
            </div>
          )}
        </div>

        {step === "confirm" && cleaningPreview && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => { setCleaningPreview(null); setStep("upload"); }}>
              重新上传
            </Button>
            <Button size="sm" className="gap-1.5" disabled={confirming} onClick={() => void handleConfirm()}>
              <Check className="w-3.5 h-3.5" />
              {confirming ? "入库中..." : "确认入库"}
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => { setPreview(null); setUpdating(false); setDatasetId(null); setStep("create"); }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 返回
            </Button>
            <div className="flex flex-wrap gap-1.5">
              {datasetId && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={api.downloadDataset(datasetId)} download>
                    <Download className="w-3.5 h-3.5" /> 下载 CSV
                  </a>
                </Button>
              )}
              {datasetId && (
                <Button size="sm" className="gap-1.5" onClick={() => startUpdate(datasetId, company, domain)}>
                  <Upload className="w-3.5 h-3.5" /> 更新上传
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
