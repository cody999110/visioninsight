import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CompanySwitcher from "@/components/layout/CompanySwitcher";
import WorkspaceMenu from "@/components/layout/WorkspaceMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataSource } from "@/contexts/DataSourceContext";
import {
  api,
  type CleaningConfigUpdate,
  type CleaningField,
  type DimensionMapping,
} from "@/lib/api";

const FALLBACK_LABELS: Record<string, string> = {
  entity_name: "主体",
  business_line: "业务线",
  department_name: "部门",
  expense_category: "费用大类",
  expense_subject: "费用科目",
  customer_name: "客户",
  product_name: "品名",
  region: "销售区域",
  province: "省份",
  business_source: "业务来源",
};

export default function CleaningConfigPage() {
  const queryClient = useQueryClient();
  const { isDemo, currentCompany, companies, openCampaign } = useDataSource();
  const company = currentCompany?.name;
  const [draft, setDraft] = useState<CleaningConfigUpdate | null>(null);
  const [saving, setSaving] = useState(false);
  const [reapplying, setReapplying] = useState(false);

  const { data: fieldsMeta } = useQuery({
    queryKey: ["cleaning-fields"],
    queryFn: () => api.getCleaningFields(),
  });
  const { data: config } = useQuery({
    queryKey: ["cleaning-config", company],
    queryFn: () => api.getCleaningConfig(company!),
    enabled: Boolean(company),
  });
  const { data: distincts } = useQuery({
    queryKey: ["cleaning-distincts", company],
    queryFn: () => api.getCleaningDistincts(company!),
    enabled: Boolean(company),
  });

  const fieldOptions = fieldsMeta?.fields ?? (Object.keys(FALLBACK_LABELS) as CleaningField[]);
  const fieldLabels = fieldsMeta?.labels ?? FALLBACK_LABELS;

  useEffect(() => {
    setDraft(null);
  }, [company]);

  useEffect(() => {
    if (!config) return;
    setDraft({
      mappings: config.mappings,
      trim_text: config.trim_text,
      normalize_dates: config.normalize_dates,
      normalize_numbers: config.normalize_numbers,
      drop_empty_rows: config.drop_empty_rows,
    });
  }, [config]);

  const sourceHints = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [field, values] of Object.entries(distincts?.fields ?? {})) {
      map[field] = values;
    }
    return map;
  }, [distincts]);

  const updateMapping = (index: number, patch: Partial<DimensionMapping>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      mappings: draft.mappings.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const addMapping = () => {
    if (!draft) return;
    const field = fieldOptions[0] ?? "entity_name";
    setDraft({
      ...draft,
      mappings: [...draft.mappings, { field, source: "", target: "" }],
    });
  };

  const removeMapping = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      mappings: draft.mappings.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!company || !draft) return;
    const cleaned: CleaningConfigUpdate = {
      ...draft,
      mappings: draft.mappings
        .map(item => ({
          ...item,
          source: item.source.trim(),
          target: item.target.trim(),
        }))
        .filter(item => item.source && item.target),
    };
    setSaving(true);
    try {
      await api.saveCleaningConfig(company, cleaned);
      setDraft(cleaned);
      await queryClient.invalidateQueries({ queryKey: ["cleaning-config", company] });
      toast.success("清洗规则已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReapplyAll = async () => {
    if (!company) return;
    const view = companies.find(item => item.name === company);
    const ids = [view?.datasets.revenue, view?.datasets.expense, view?.datasets.fund].filter(
      (id): id is string => Boolean(id),
    );
    if (!ids.length) {
      toast.error("该公司暂无可重新清洗的数据集，请先上传数据");
      return;
    }
    setReapplying(true);
    try {
      for (const id of ids) {
        await api.reapplyCleaning(id, true);
      }
      await queryClient.invalidateQueries({ queryKey: ["cleaning-distincts", company] });
      toast.success(`已按最新规则重新清洗 ${ids.length} 个数据集`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重新清洗失败");
    } finally {
      setReapplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[960px] mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold text-foreground tracking-tight leading-none">
              数据清洗配置
            </h1>
            <CompanySwitcher className="mt-1" />
          </div>
          <WorkspaceMenu />
        </div>

        {isDemo && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            清洗规则按公司生效。请先在左上角切换到已上传公司；也可先{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => openCampaign()}>
              上传 Campaign 数据
            </button>{" "}
            后再配置映射。
          </div>
        )}

        {!company ? (
          <div className="rounded-lg border border-border px-4 py-8 text-sm text-muted-foreground text-center">
            请选择公司后再配置清洗规则。
          </div>
        ) : !draft ? (
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="text-sm font-medium">结构规范化</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["trim_text", "去除文本首尾空格"],
                    ["normalize_dates", "规范化日期"],
                    ["normalize_numbers", "规范化数值"],
                    ["drop_empty_rows", "丢弃空行"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span>{label}</span>
                    <Switch
                      checked={draft[key]}
                      onCheckedChange={(checked) => setDraft({ ...draft, [key]: checked })}
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                结构规范化在上传时自动执行；下方映射在结构规范化之后套用，类似 Power Query 的「替换值」。
              </p>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">维度映射</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    将原始维度值统一到标准名称（主体、业务线、科目等）。
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addMapping}>
                  <Plus className="w-3.5 h-3.5" /> 添加映射
                </Button>
              </div>

              {draft.mappings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">暂无映射规则。上传数据后可从下方候选项点选原值。</p>
              ) : (
                <div className="space-y-2">
                  {draft.mappings.map((item, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[140px_1fr_1fr_auto] items-start">
                      <Select
                        value={item.field}
                        onValueChange={(value: CleaningField) => updateMapping(index, { field: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map(field => (
                            <SelectItem key={field} value={field}>
                              {fieldLabels[field] ?? field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="space-y-1">
                        <Input
                          className="h-9"
                          placeholder="原值"
                          value={item.source}
                          onChange={(e) => updateMapping(index, { source: e.target.value })}
                          list={`cleaning-source-${item.field}`}
                        />
                        {(sourceHints[item.field] ?? []).length > 0 && (
                          <datalist id={`cleaning-source-${item.field}`}>
                            {sourceHints[item.field].map(value => (
                              <option key={value} value={value} />
                            ))}
                          </datalist>
                        )}
                      </div>
                      <Input
                        className="h-9"
                        placeholder="标准值"
                        value={item.target}
                        onChange={(e) => updateMapping(index, { target: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => removeMapping(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(sourceHints).length > 0 && (
                <div className="pt-2 space-y-2 border-t border-border">
                  <Label className="text-xs text-muted-foreground">已上传数据中的取值（点击填入原值）</Label>
                  {Object.entries(sourceHints).map(([field, values]) => (
                    <div key={field} className="space-y-1">
                      <div className="text-xs font-medium">{fieldLabels[field] ?? field}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {values.slice(0, 24).map(value => (
                          <button
                            key={value}
                            type="button"
                            className="text-[11px] px-2 py-1 rounded-md border border-border hover:border-primary/40"
                            onClick={() => {
                              setDraft({
                                ...draft,
                                mappings: [
                                  ...draft.mappings,
                                  { field: field as CleaningField, source: value, target: "" },
                                ],
                              });
                            }}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "保存中..." : "保存规则"}
              </Button>
              <Button variant="outline" onClick={() => void handleReapplyAll()} disabled={reapplying}>
                {reapplying ? "重新清洗中..." : "对已入库数据重新清洗"}
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/">返回看板</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
