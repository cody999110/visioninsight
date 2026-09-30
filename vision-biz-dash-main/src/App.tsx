import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataSourceProvider } from "@/contexts/DataSourceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardLayoutProvider } from "@/contexts/DashboardLayoutContext";
import CampaignManager from "./components/campaign/CampaignManager";
import Index from "./pages/Index";
import ExpenseAnalysis from "./pages/ExpenseAnalysis";
import RevenueAnalysis from "./pages/RevenueAnalysis";
import FundAnalysis from "./pages/FundAnalysis";
import CleaningConfig from "./pages/CleaningConfig";
import ManagementConfig from "./pages/ManagementConfig";
import ManagementReport from "./pages/ManagementReport";
import ManagementCharts from "./pages/ManagementCharts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <DataSourceProvider>
        <DashboardLayoutProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <CampaignManager />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/expense-analysis" element={<ExpenseAnalysis />} />
                <Route path="/revenue-analysis" element={<RevenueAnalysis />} />
                <Route path="/fund-analysis" element={<FundAnalysis />} />
                <Route path="/cleaning/config" element={<CleaningConfig />} />
                <Route path="/management/config" element={<ManagementConfig />} />
                <Route path="/management/report" element={<ManagementReport />} />
                <Route path="/management/charts" element={<ManagementCharts />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DashboardLayoutProvider>
      </DataSourceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
