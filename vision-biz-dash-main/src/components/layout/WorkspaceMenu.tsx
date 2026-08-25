import { useLocation, useNavigate } from "react-router-dom";
import { FolderPlus, LayoutDashboard, LayoutGrid, PieChart, Settings2, Sparkles, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataSource } from "@/contexts/DataSourceContext";

export default function WorkspaceMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCampaign } = useDataSource();
  const onDashboard = location.pathname === "/";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5" />
          功能
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
  );
}
