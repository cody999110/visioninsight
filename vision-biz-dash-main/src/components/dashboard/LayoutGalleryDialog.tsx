import { Check, LayoutTemplate, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  WIDGET_GROUP_LABELS,
  WIDGET_META,
  type WidgetGroup,
  type WidgetId,
} from "@/lib/dashboardLayout";
import { LAYOUT_PRESETS } from "@/lib/layoutPresets";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";

interface LayoutGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PresetPreview({ presetId }: { presetId: string }) {
  const previews: Record<string, string[]> = {
    classic: ["████████████", "████████ ░░░░", "░░░░ ░░░░ ░░░░"],
    overview: ["████████████", "██████ ██████", "██████ ██████"],
    cost_control: ["████ ░░░░░░░░", "██████ ██████"],
    cash_ops: ["████████████", "████████ ░░░░", "██████ ██████"],
    mgmt_focus: ["████████████", "████████████", "██████ ██████"],
  };
  const rows = previews[presetId] ?? ["████████████", "██████ ██████"];

  return (
    <div className="rounded-md bg-muted/60 p-2 space-y-1 font-mono text-[9px] leading-tight text-primary/70 select-none">
      {rows.map((row, i) => (
        <div key={i} className="tracking-tight whitespace-pre overflow-hidden">
          {row}
        </div>
      ))}
    </div>
  );
}

const GROUP_ORDER: WidgetGroup[] = ["ops", "fund", "revenue", "expense", "management"];

export default function LayoutGalleryDialog({ open, onOpenChange }: LayoutGalleryDialogProps) {
  const { layout, applyLayoutPreset, resetToClassic, setWidgetVisible } = useDashboardLayout();
  const visibility = new Map(layout.widgets.map(w => [w.id, w.visible]));
  const visibleCount = layout.widgets.filter(w => w.visible).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            布局与模块
          </DialogTitle>
          <DialogDescription>
            套用预设或勾选模块；设置按当前公司单独保存。经营 KPI 与资金 KPI 可同时开启。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">布局预设</TabsTrigger>
            <TabsTrigger value="modules">模块选择</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYOUT_PRESETS.map(preset => {
                const active = layout.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      applyLayoutPreset(preset.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "text-left rounded-xl border p-3 transition-all hover:border-primary/40 hover:bg-accent/40",
                      active ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card",
                    )}
                  >
                    <div className="mb-2">
                      <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {preset.name}
                        {active && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{preset.description}</p>
                    </div>
                    <PresetPreview presetId={preset.id} />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  resetToClassic();
                  onOpenChange(false);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                恢复经典布局
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4 mt-3">
            <p className="text-xs text-muted-foreground">
              当前已显示 {visibleCount} 个模块
              {visibleCount > 8 ? "（建议不超过 8 个，以免首屏过挤）" : ""}
              {layout.presetId === "custom" ? " · 自定义" : ""}
            </p>
            {GROUP_ORDER.map(group => {
              const items = WIDGET_META.filter(w => w.group === group);
              return (
                <div key={group} className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{WIDGET_GROUP_LABELS[group]}</div>
                  <div className="rounded-xl border border-border divide-y divide-border">
                    {items.map(item => (
                      <label
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                        </div>
                        <Switch
                          checked={visibility.get(item.id as WidgetId) ?? false}
                          onCheckedChange={checked => setWidgetVisible(item.id, checked)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
