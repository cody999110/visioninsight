import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FolderPlus,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  Palette,
  PieChart,
  Settings2,
  Sparkles,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataSource } from "@/contexts/DataSourceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_OPTIONS, type ThemeId } from "@/lib/theme";
import LayoutGalleryDialog from "@/components/dashboard/LayoutGalleryDialog";

export default function WorkspaceMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCampaign } = useDataSource();
  const { theme, setTheme } = useTheme();
  const [layoutOpen, setLayoutOpen] = useState(false);
  const onDashboard = location.pathname === "/";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            功能
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">数据</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem className="gap-2 text-sm" onSelect={() => openCampaign()}>
              <FolderPlus className="w-4 h-4" />
              Campaign 数据
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm" onSelect={() => navigate("/cleaning/config")}>
              <Sparkles className="w-4 h-4" />
              数据清洗
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">分析</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem className="gap-2 text-sm" onSelect={() => navigate("/management/report")}>
              <Table2 className="w-4 h-4" />
              管理报表
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm" onSelect={() => navigate("/management/charts")}>
              <PieChart className="w-4 h-4" />
              管理图表
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm" onSelect={() => navigate("/management/config")}>
              <Settings2 className="w-4 h-4" />
              报表配置
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Palette className="w-3 h-3" />
            外观皮肤
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={v => setTheme(v as ThemeId)}>
            {THEME_OPTIONS.map(opt => (
              <DropdownMenuRadioItem key={opt.id} value={opt.id} className="text-sm">
                {opt.label}
                <span className="ml-auto text-[10px] text-muted-foreground">{opt.hint}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {onDashboard && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-sm"
                onSelect={e => {
                  e.preventDefault();
                  setLayoutOpen(true);
                }}
              >
                <LayoutTemplate className="w-4 h-4" />
                布局与模块
              </DropdownMenuItem>
            </>
          )}
          {!onDashboard && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-sm" onSelect={() => navigate("/")}>
                <LayoutDashboard className="w-4 h-4" />
                VisionInsight
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDashboard && <LayoutGalleryDialog open={layoutOpen} onOpenChange={setLayoutOpen} />}
    </>
  );
}
