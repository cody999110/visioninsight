const API_BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed: ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (typeof parsed.detail === "string") {
        message = parsed.detail;
      } else if (Array.isArray(parsed.detail)) {
        message = parsed.detail
          .map((item) => (typeof item === "object" && item && "msg" in item ? String((item as { msg: unknown }).msg) : String(item)))
          .join("；");
      }
    } catch {
      // keep raw text
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export type Domain = "expense" | "revenue" | "fund";
export type DatasetStatus =
  | "draft"
  | "validating"
  | "pending_confirm"
  | "validated"
  | "failed"
  | "active"
  | "archived";

export interface ImportTemplateSummary {
  code: string;
  name: string;
  domain: Domain;
  version: string;
  description: string;
}

export interface ImportTemplateListResponse {
  items: ImportTemplateSummary[];
  total: number;
}

export interface DatasetSummary {
  id: string;
  name: string;
  company: string;
  domain: Domain;
  template_code: string;
  status: DatasetStatus;
  row_count: number;
  error_count: number;
  data_as_of: string | null;
  created_at: string;
  activated_at: string | null;
}

export interface DatasetColumn {
  key: string;
  label: string;
}

export interface DatasetListResponse {
  items: DatasetSummary[];
  total: number;
}

export interface CompanyView {
  name: string;
  datasets: {
    expense?: string | null;
    revenue?: string | null;
    fund?: string | null;
  };
  data_as_of: string | null;
}

export interface CompanyListResponse {
  items: CompanyView[];
  total: number;
}

export interface DatasetDetail extends DatasetSummary {
  errors: string[];
  preview_rows: Record<string, unknown>[];
  columns: DatasetColumn[];
}

export interface UploadResult {
  batch_id: string;
  dataset_id: string;
  status: DatasetStatus;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  can_activate: boolean;
  needs_confirm?: boolean;
  message: string;
  errors: string[];
  cleaning_summary?: CleaningSummary | null;
}

export interface ConfirmImportResult {
  dataset_id: string;
  status: DatasetStatus;
  success_rows: number;
  message: string;
  cleaning_summary?: CleaningSummary | null;
}

export type CleaningField =
  | "entity_name"
  | "business_line"
  | "department_name"
  | "expense_category"
  | "expense_subject"
  | "customer_name"
  | "product_name"
  | "region"
  | "province"
  | "business_source";

export interface DimensionMapping {
  field: CleaningField;
  source: string;
  target: string;
}

export interface CleaningConfig {
  company: string;
  mappings: DimensionMapping[];
  trim_text: boolean;
  normalize_dates: boolean;
  normalize_numbers: boolean;
  drop_empty_rows: boolean;
  updated_at: string | null;
}

export interface CleaningConfigUpdate {
  mappings: DimensionMapping[];
  trim_text: boolean;
  normalize_dates: boolean;
  normalize_numbers: boolean;
  drop_empty_rows: boolean;
}

export interface FieldChangeSummary {
  field: string;
  before: string;
  after: string;
  count: number;
}

export interface RowFieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

export interface RowDiff {
  row_no: number;
  changes: RowFieldDiff[];
}

export interface CleaningSummary {
  total_rows: number;
  success_rows: number;
  error_rows: number;
  mapped_cells: number;
  changed_rows: number;
  unchanged_rows: number;
  unmapped_values: Record<string, string[]>;
  field_changes: FieldChangeSummary[];
  sample_diffs: RowDiff[];
  warnings: string[];
}

export interface CleaningPreviewResponse {
  dataset_id: string;
  company: string;
  domain: Domain;
  status: DatasetStatus;
  summary: CleaningSummary;
  columns: DatasetColumn[];
  raw_preview: Record<string, unknown>[];
  cleaned_preview: Record<string, unknown>[];
  errors: string[];
}

export interface CleaningDistincts {
  company: string;
  fields: Record<string, string[]>;
}

export interface CleaningFieldsResponse {
  fields: CleaningField[];
  labels: Record<string, string>;
}

export interface DataFreshnessResponse {
  label: string;
  source_mode: string;
  dataset_id: string | null;
  dataset_name: string | null;
}

export interface LiveDataMeta {
  source_mode: string;
  dataset_id: string | null;
  is_live_data: boolean;
}

export interface FundKpiResponse extends LiveDataMeta {
  total: number;
  bank_deposit: number;
  cash_on_hand: number;
  short_term_investment: number;
  change: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  gross_profit: number;
  gross_margin: number;
}

export interface RevenueTrendResponse extends LiveDataMeta {
  years: Record<string, RevenueTrendPoint[]>;
}

export interface TopCustomerItem {
  name: string;
  sales: number;
  percentage: number;
  trend: number | null;
}

export interface TopCustomersResponse extends LiveDataMeta {
  items: TopCustomerItem[];
}

export interface RegionSalesResponse extends LiveDataMeta {
  regions: Record<string, number>;
}

export interface ProductMarginItem {
  name: string;
  margin: number;
  revenue: number;
  color: string;
}

export interface ProductMarginResponse extends LiveDataMeta {
  items: ProductMarginItem[];
}

export interface ExpenseStructureItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface ExpenseStructureResponse extends LiveDataMeta {
  year: string;
  items: ExpenseStructureItem[];
}

export interface BusinessLineConfig {
  id: string;
  name: string;
  aliases: string[];
  catch_all: boolean;
}

export interface ExpenseGroupConfig {
  id: string;
  name: string;
  subjects: string[];
}

export type AllocationMatchField = "expense_category" | "department_name" | "expense_subject";
export type AllocationMethod = "ratio" | "revenue_share";

export interface AllocationRuleConfig {
  id: string;
  name: string;
  match_field: AllocationMatchField;
  match_values: string[];
  method: AllocationMethod;
  ratios: Record<string, number>;
}

export interface ManagementConfig {
  company: string;
  business_lines: BusinessLineConfig[];
  expense_groups: ExpenseGroupConfig[];
  allocation_rules: AllocationRuleConfig[];
  updated_at: string | null;
}

export interface ManagementConfigUpdate {
  business_lines: BusinessLineConfig[];
  expense_groups: ExpenseGroupConfig[];
  allocation_rules: AllocationRuleConfig[];
}

export interface ManagementDistincts {
  company: string;
  business_lines: string[];
  departments: string[];
  expense_categories: string[];
  expense_subjects: string[];
  mapped_business_lines: string[];
  unmapped_business_lines: string[];
  unmapped_subjects: string[];
}

export interface PeriodAmounts {
  h1: number;
  h2: number;
  year: number;
  prior_year: number;
  yoy: number | null;
}

export type ReportRowKind = "line" | "unmapped" | "unallocated" | "total";

export interface ReportLineRow {
  line_id: string;
  line_name: string;
  kind: ReportRowKind;
  revenue: PeriodAmounts;
  cost: PeriodAmounts;
  gross_profit: PeriodAmounts;
  gross_margin: PeriodAmounts;
  expense: PeriodAmounts;
  expense_groups: Record<string, PeriodAmounts>;
}

export interface ManagementKpis {
  revenue: number;
  revenue_prior: number;
  revenue_yoy: number | null;
  gross_profit: number;
  gross_margin: number;
  expense: number;
  unallocated_expense: number;
}

export interface ManagementReportResponse {
  company: string;
  year: number;
  prior_year: number;
  available_years: number[];
  has_revenue: boolean;
  has_expense: boolean;
  kpis: ManagementKpis;
  lines: ReportLineRow[];
  groups: { id: string; name: string }[];
  warnings: string[];
  summary: string;
  is_live_data: boolean;
}

export const api = {
  listTemplates(domain?: Domain) {
    const query = domain ? `?domain=${domain}` : "";
    return request<ImportTemplateListResponse>(`/import/templates${query}`);
  },

  downloadTemplate(code: string) {
    return `${API_BASE}/import/templates/${code}/download`;
  },

  downloadDataset(datasetId: string) {
    return `${API_BASE}/import/datasets/${datasetId}/download`;
  },

  getDataset(datasetId: string, previewLimit = 50) {
    return request<DatasetDetail>(`/import/datasets/${datasetId}?preview_limit=${previewLimit}`);
  },

  listDatasets(domain?: Domain) {
    const query = domain ? `?domain=${domain}` : "";
    return request<DatasetListResponse>(`/import/datasets${query}`);
  },

  listCompanies() {
    return request<CompanyListResponse>("/import/datasets/companies");
  },

  createDataset(payload: { name: string; company: string; domain: Domain; template_code: string }) {
    return request<DatasetDetail>("/import/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  uploadDataset(datasetId: string, file: File, autoConfirm = false) {
    const formData = new FormData();
    formData.append("file", file);
    const query = autoConfirm ? "?auto_confirm=true" : "?auto_confirm=false";
    return request<UploadResult>(`/import/datasets/${datasetId}/upload${query}`, {
      method: "POST",
      body: formData,
    });
  },

  getCleaningPreview(datasetId: string, previewLimit = 30) {
    return request<CleaningPreviewResponse>(
      `/import/datasets/${datasetId}/cleaning-preview?preview_limit=${previewLimit}`,
    );
  },

  confirmDataset(datasetId: string) {
    return request<ConfirmImportResult>(`/import/datasets/${datasetId}/confirm`, {
      method: "POST",
    });
  },

  reapplyCleaning(datasetId: string, autoConfirm = false) {
    const query = autoConfirm ? "?auto_confirm=true" : "?auto_confirm=false";
    return request<UploadResult>(`/import/datasets/${datasetId}/reapply-cleaning${query}`, {
      method: "POST",
    });
  },

  activateDataset(datasetId: string) {
    return request<{ dataset_id: string; status: DatasetStatus; message: string }>(
      `/import/datasets/${datasetId}/activate`,
      { method: "POST" },
    );
  },

  getCleaningConfig(company: string) {
    return request<CleaningConfig>(`/cleaning/config?company=${encodeURIComponent(company)}`);
  },

  saveCleaningConfig(company: string, payload: CleaningConfigUpdate) {
    return request<CleaningConfig>(`/cleaning/config?company=${encodeURIComponent(company)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getCleaningDistincts(company: string) {
    return request<CleaningDistincts>(`/cleaning/distincts?company=${encodeURIComponent(company)}`);
  },

  getCleaningFields() {
    return request<CleaningFieldsResponse>("/cleaning/fields");
  },

  getDataFreshness(datasetId?: string) {
    const query = datasetId ? `?source_mode=dataset&dataset_id=${datasetId}` : "";
    return request<DataFreshnessResponse>(`/meta/data-freshness${query}`);
  },

  getFundKpi(datasetId?: string) {
    const query = datasetId ? `?dataset_id=${datasetId}` : "";
    return request<FundKpiResponse>(`/dashboard/fund-kpi${query}`);
  },

  getRevenueTrend(years: string[], datasetId?: string) {
    const params = new URLSearchParams();
    if (years.length) params.set("years", years.join(","));
    if (datasetId) params.set("dataset_id", datasetId);
    const query = params.toString();
    return request<RevenueTrendResponse>(`/dashboard/revenue-trend${query ? `?${query}` : ""}`);
  },

  getTopCustomers(datasetId?: string) {
    const query = datasetId ? `?dataset_id=${datasetId}` : "";
    return request<TopCustomersResponse>(`/dashboard/top-customers${query}`);
  },

  getRegionSales(datasetId?: string) {
    const query = datasetId ? `?dataset_id=${datasetId}` : "";
    return request<RegionSalesResponse>(`/dashboard/region-sales${query}`);
  },

  getProductMargin(datasetId?: string) {
    const query = datasetId ? `?dataset_id=${datasetId}` : "";
    return request<ProductMarginResponse>(`/dashboard/product-margin${query}`);
  },

  getExpenseStructure(year: string, datasetId?: string) {
    const params = new URLSearchParams({ year });
    if (datasetId) params.set("dataset_id", datasetId);
    return request<ExpenseStructureResponse>(`/dashboard/expense-structure?${params.toString()}`);
  },

  getManagementConfig(company: string) {
    return request<ManagementConfig>(`/management/config?company=${encodeURIComponent(company)}`);
  },

  saveManagementConfig(company: string, payload: ManagementConfigUpdate) {
    return request<ManagementConfig>(`/management/config?company=${encodeURIComponent(company)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getManagementDistincts(company: string) {
    return request<ManagementDistincts>(`/management/distincts?company=${encodeURIComponent(company)}`);
  },

  getManagementReport(company: string, year?: number) {
    const params = new URLSearchParams({ company });
    if (year) params.set("year", String(year));
    return request<ManagementReportResponse>(`/management/report?${params.toString()}`);
  },
};
