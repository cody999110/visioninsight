import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CompanyView, type Domain } from "@/lib/api";

export const DEMO_VIEW = "__demo__";

export interface CampaignPreset {
  company?: string;
  domain?: Domain;
}

interface DataSourceContextValue {
  /** Selected view: DEMO_VIEW for demo/sample data, or a company name. */
  selectedView: string;
  isDemo: boolean;
  companies: CompanyView[];
  currentCompany: CompanyView | null;
  /** Returns the dataset id to query for the given domain under current view, or undefined. */
  datasetFor: (domain: Domain) => string | undefined;
  selectView: (view: string) => void;
  refreshCompanies: () => Promise<void>;
  isLoading: boolean;
  /** Shared campaign upload dialog state. */
  campaignOpen: boolean;
  campaignPreset: CampaignPreset | null;
  openCampaign: (preset?: CampaignPreset) => void;
  setCampaignOpen: (open: boolean) => void;
}

const DataSourceContext = createContext<DataSourceContextValue | null>(null);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<string>(DEMO_VIEW);

  const { data, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api.listCompanies(),
    refetchOnWindowFocus: true,
  });

  const companies = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    if (selectedView === DEMO_VIEW) return;
    if (isLoading) return;
    if (!companies.some(company => company.name === selectedView)) {
      setSelectedView(DEMO_VIEW);
    }
  }, [companies, selectedView, isLoading]);

  const currentCompany = useMemo(
    () => (selectedView === DEMO_VIEW ? null : companies.find(c => c.name === selectedView) ?? null),
    [companies, selectedView],
  );

  const isDemo = selectedView === DEMO_VIEW;

  const datasetFor = useCallback(
    (domain: Domain) => {
      if (isDemo || !currentCompany) return undefined;
      return currentCompany.datasets[domain] ?? undefined;
    },
    [isDemo, currentCompany],
  );

  const selectView = useCallback((view: string) => setSelectedView(view), []);

  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignPreset, setCampaignPreset] = useState<CampaignPreset | null>(null);
  const openCampaign = useCallback((preset?: CampaignPreset) => {
    setCampaignPreset(preset ?? null);
    setCampaignOpen(true);
  }, []);

  const refreshCompanies = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["companies"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["freshness"] });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      selectedView,
      isDemo,
      companies,
      currentCompany,
      datasetFor,
      selectView,
      refreshCompanies,
      isLoading,
      campaignOpen,
      campaignPreset,
      openCampaign,
      setCampaignOpen,
    }),
    [
      selectedView,
      isDemo,
      companies,
      currentCompany,
      datasetFor,
      selectView,
      refreshCompanies,
      isLoading,
      campaignOpen,
      campaignPreset,
      openCampaign,
    ],
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error("useDataSource must be used within DataSourceProvider");
  }
  return context;
}
