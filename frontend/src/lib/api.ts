const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (error instanceof ApiError && error.message) return error.message;
  if (error instanceof Error && error.message && error.message !== 'Failed to fetch') return error.message;
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('crm_token');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || data?.message || 'Request failed',
      response.status,
      data,
    );
  }

  return data as T;
}

async function download(path: string, fallbackFilename: string): Promise<void> {
  const token = localStorage.getItem('crm_token');
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'text/csv',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      data?.error?.message || data?.message || 'Download failed',
      response.status,
      data,
    );
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="?([^"]+)"?/i)?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User }>('/auth/me'),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  getContacts: (params?: Record<string, string>) =>
    request<Paginated<Contact>>(`/contacts?${new URLSearchParams(params)}`),

  createContact: (data: Partial<Contact>) =>
    request<{ contact: Contact }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateContact: (id: number, data: Partial<Contact>) =>
    request<{ contact: Contact }>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteContact: (id: number) =>
    request(`/contacts/${id}`, { method: 'DELETE' }),

  getAccounts: (params?: Record<string, string>) =>
    request<Paginated<Account>>(`/accounts?${new URLSearchParams(params)}`),

  createAccount: (data: Partial<Account>) =>
    request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAccount: (id: number, data: Partial<Account>) =>
    request<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAccount: (id: number) =>
    request(`/accounts/${id}`, { method: 'DELETE' }),

  getLeads: (params?: Record<string, string>) =>
    request<Paginated<Lead>>(`/leads?${new URLSearchParams(params)}`),

  createLead: (data: Partial<Lead>) =>
    request<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLead: (id: number, data: Partial<Lead>) =>
    request<Lead>(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLead: (id: number) =>
    request(`/leads/${id}`, { method: 'DELETE' }),

  convertLead: (id: number, options?: Record<string, unknown>) =>
    request(`/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(options ?? {}),
    }),

  getPipelines: () => request<Pipeline[]>('/pipelines'),

  getDealsKanban: (pipelineId: number) =>
    request<KanbanData>(`/deals?view=kanban&pipeline_id=${pipelineId}`),

  updateDealStage: (dealId: number, stageId: number, winLossReason?: string) =>
    request<Deal>(`/deals/${dealId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage_id: stageId, win_loss_reason: winLossReason }),
    }),

  createDeal: (data: Partial<Deal>) =>
    request<Deal>('/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDeal: (id: number, data: Partial<Deal>) =>
    request<Deal>(`/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDeal: (id: number) =>
    request(`/deals/${id}`, { method: 'DELETE' }),

  getTasks: (params?: Record<string, string>) =>
    request<Paginated<Task>>(`/tasks?${new URLSearchParams(params)}`),

  createTask: (data: Partial<Task>) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: number) =>
    request(`/tasks/${id}`, { method: 'DELETE' }),

  getMarketingContent: (params?: Record<string, string>) =>
    request<Paginated<MarketingContentItem>>(
      `/marketing/content-items?${new URLSearchParams(params ?? {})}`
    ),
  createMarketingContent: (data: MarketingContentSubmission) =>
    request<MarketingContentItem>('/marketing/content-items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMarketingContent: (id: number, data: Partial<MarketingContentItem>) =>
    request<MarketingContentItem>(`/marketing/content-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMarketingContent: (id: number) =>
    request(`/marketing/content-items/${id}`, { method: 'DELETE' }),
  getMarketingContributors: () =>
    request<User[]>('/marketing/contributors'),

  getPipelineSummary: () =>
    request<PipelineSummary>('/reports/pipeline-summary'),

  getConversionRate: () =>
    request<{ sources: ConversionSource[] }>('/reports/conversion-rate'),

  getLeaderboard: () =>
    request<{ leaderboard: LeaderboardEntry[] }>('/reports/leaderboard'),

  // Activities
  getActivities: (params?: Record<string, string>) =>
    request<Paginated<Activity>>(`/activities?${new URLSearchParams(params ?? {})}`),
  createActivity: (data: Partial<Activity>) =>
    request<Activity>('/activities', { method: 'POST', body: JSON.stringify(data) }),

  // Users (admin)
  getUsers: () => request<User[]>('/users'),
  createUser: (data: Record<string, string>) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, string>) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),

  // Import/Export
  importContacts: (records: Record<string, string>[]) =>
    request<{ imported: number }>('/import-export/contacts', {
      method: 'POST', body: JSON.stringify({ records }),
    }),
  downloadContactsCsv: () => download('/import-export/contacts/csv', 'contacts.csv'),
  importAreas: (records: Record<string, string>[]) =>
    request<{ created: number; rows_processed: number }>('/import-export/areas', {
      method: 'POST', body: JSON.stringify({ records }),
    }),
  downloadAreasTemplate: () =>
    download('/import-export/areas/template/csv', 'territories-import-template.csv'),

  // Phase 2
  getAutomationRules: () => request<AutomationRule[]>('/automation-rules'),
  createAutomationRule: (data: Partial<AutomationRule>) =>
    request<AutomationRule>('/automation-rules', { method: 'POST', body: JSON.stringify(data) }),
  getWebhooks: () => request<Webhook[]>('/webhooks'),
  createWebhook: (data: Partial<Webhook>) =>
    request<Webhook>('/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  getEmailTemplates: () => request<EmailTemplate[]>('/email/templates'),
  createEmailTemplate: (data: Partial<EmailTemplate>) =>
    request<EmailTemplate>('/email/templates', { method: 'POST', body: JSON.stringify(data) }),
  getEmailAccounts: () => request<EmailAccount[]>('/email/accounts'),
  connectEmailAccount: (data: { provider: string; email: string }) =>
    request('/email/accounts', { method: 'POST', body: JSON.stringify(data) }),
  getCustomReports: () => request<CustomReport[]>('/custom-reports'),
  createCustomReport: (data: Partial<CustomReport>) =>
    request<CustomReport>('/custom-reports', { method: 'POST', body: JSON.stringify(data) }),
  runCustomReport: (id: number) => request(`/custom-reports/${id}/run`),

  // Phase 3
  getForecast: () => request<ForecastData>('/forecast'),
  createSmsLog: (data: Partial<SmsLog>) =>
    request('/sms-logs', { method: 'POST', body: JSON.stringify(data) }),

  // Phase 4
  getTerritories: () => request<Territory[]>('/territories'),
  getLeadScoreRules: () => request<LeadScoreRule[]>('/lead-score-rules'),
  recalculateLeadScores: () => request('/lead-score-rules/recalculate', { method: 'POST' }),
  getAnalytics: () => request<AnalyticsOverview>('/analytics/overview'),
  getAuditLogs: () => request<Paginated<AuditLog>>('/analytics/audit-logs'),
  getApiKeys: () => request<ApiKeyRecord[]>('/api-keys'),
  createApiKey: (name: string) =>
    request<{ key: string; name: string }>('/api-keys', {
      method: 'POST', body: JSON.stringify({ name }),
    }),

  // Areas
  getAreas: (params?: Record<string, string>) =>
    request<Paginated<Area>>(`/areas?${new URLSearchParams(params ?? {})}`),
  getArea: (id: number) => request<Area>(`/areas/${id}`),
  createArea: (data: Partial<Area>) =>
    request<Area>('/areas', { method: 'POST', body: JSON.stringify(data) }),
  createInlineStreet: (data: { name: string; parent_area_id: number }) =>
    request<Area>('/areas/streets', { method: 'POST', body: JSON.stringify(data) }),
  updateArea: (id: number, data: Partial<Area>) =>
    request<Area>(`/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Services
  getServices: (params?: Record<string, string>) =>
    request<Paginated<Service>>(`/services?${new URLSearchParams(params ?? {})}`),
  createService: (data: Partial<Service>) =>
    request<Service>('/services', { method: 'POST', body: JSON.stringify(data) }),

  // Contracts
  getContracts: (params?: Record<string, string>) =>
    request<Paginated<Contract>>(`/contracts?${new URLSearchParams(params ?? {})}`),
  createContract: (data: Partial<Contract>) =>
    request<Contract>('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id: number, data: Partial<Contract>) =>
    request<Contract>(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContract: (id: number) =>
    request(`/contracts/${id}`, { method: 'DELETE' }),

  // Leave
  getLeaveTypes: () => request<Paginated<LeaveType>>('/leave/types'),
  getLeaveRequests: (params?: Record<string, string>) =>
    request<Paginated<LeaveRequest>>(`/leave/requests?${new URLSearchParams(params ?? {})}`),
  createLeaveRequest: (data: Partial<LeaveRequest>) =>
    request<LeaveRequest>('/leave/requests', { method: 'POST', body: JSON.stringify(data) }),
  approveLeaveRequest: (id: number) =>
    request<LeaveRequest>(`/leave/requests/${id}/approve`, { method: 'POST' }),
  updateLeaveRequest: (id: number, data: Partial<LeaveRequest>) =>
    request<LeaveRequest>(`/leave/requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLeaveRequest: (id: number) =>
    request(`/leave/requests/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (params?: Record<string, string>) =>
    request<Paginated<Expense>>(`/expenses?${new URLSearchParams(params ?? {})}`),
  createExpense: (data: Partial<Expense>) =>
    request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: number, data: Partial<Expense>) =>
    request<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: number) =>
    request(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseCategories: () => request<Paginated<ExpenseCategory>>('/expenses/categories'),

  // Finance
  getInvoices: (params?: Record<string, string>) =>
    request<Paginated<Invoice>>(`/finance/invoices?${new URLSearchParams(params ?? {})}`),
  getFinancialSummary: (params?: Record<string, string>) =>
    request<FinancialSummary>(`/finance/summary?${new URLSearchParams(params ?? {})}`),
  getChartOfAccounts: (params?: Record<string, string>) =>
    request<Paginated<ChartOfAccount>>(`/finance/accounts?${new URLSearchParams(params ?? {})}`),

  // Inventory
  getProducts: (params?: Record<string, string>) =>
    request<Paginated<Product>>(`/inventory/products?${new URLSearchParams(params ?? {})}`),
  createProduct: (data: Partial<Product>) =>
    request<Product>('/inventory/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: Partial<Product>) =>
    request<Product>(`/inventory/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) =>
    request(`/inventory/products/${id}`, { method: 'DELETE' }),
  getPurchaseOrders: (params?: Record<string, string>) =>
    request<Paginated<PurchaseOrder>>(`/inventory/purchase-orders?${new URLSearchParams(params ?? {})}`),
  deletePurchaseOrder: (id: number) =>
    request(`/inventory/purchase-orders/${id}`, { method: 'DELETE' }),
  getStockLevels: (params?: Record<string, string>) =>
    request<Paginated<StockLevel>>(`/inventory/stock-levels?${new URLSearchParams(params ?? {})}`),

  // HR
  getEmployees: (params?: Record<string, string>) =>
    request<Paginated<Employee>>(`/hr/employees?${new URLSearchParams(params ?? {})}`),
  createEmployee: (data: Partial<Employee>) =>
    request<Employee>('/hr/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: Partial<Employee>) =>
    request<Employee>(`/hr/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: number) =>
    request(`/hr/employees/${id}`, { method: 'DELETE' }),
  getPayrollRuns: (params?: Record<string, string>) =>
    request<Paginated<PayrollRun>>(`/hr/payroll-runs?${new URLSearchParams(params ?? {})}`),

  // Projects
  getProjects: (params?: Record<string, string>) =>
    request<Paginated<Project>>(`/projects?${new URLSearchParams(params ?? {})}`),
  createProject: (data: Partial<Project>) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) =>
    request(`/projects/${id}`, { method: 'DELETE' }),
  getProjectTasks: (params?: Record<string, string>) =>
    request<Paginated<ProjectTask>>(`/projects/tasks?${new URLSearchParams(params ?? {})}`),

  // Reports
  getVisitsByArea: (params: Record<string, string>) =>
    request<VisitsByAreaReport>(`/reports/visits-by-area?${new URLSearchParams(params)}`),
  getLeadsPerRepPerDay: (params: Record<string, string>) =>
    request<LeadsPerRepReport>(`/reports/leads-per-rep-per-day?${new URLSearchParams(params)}`),

  // Modules (admin)
  getModules: () => request<ModuleConfig>('/modules'),
};

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: string;
  last_login_at?: string;
  tenant: {
    id: number;
    name: string;
    slug: string;
    default_currency: string;
    enabled_modules?: string[];
  } | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  title?: string;
  account_id?: number;
  area_id?: number;
  account?: Account;
  area?: Area;
  owner?: User;
}

export interface Account {
  id: number;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  area_id?: number;
  area?: Area;
  owner?: User;
}

export interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  campaign?: string;
  status: string;
  score?: number;
  owner?: User;
}

export interface Pipeline {
  id: number;
  name: string;
  is_default: boolean;
  stages: PipelineStage[];
}

export interface PipelineStage {
  id: number;
  name: string;
  sort_order: number;
  probability: number;
  is_closed: boolean;
  is_won: boolean;
}

export interface Deal {
  id: number;
  name: string;
  value: number;
  currency: string;
  stage_id: number;
  pipeline_id: number;
  stage?: PipelineStage;
  account?: Account;
  contact?: Contact;
  owner?: User;
  status: string;
  expected_close_date?: string;
}

export interface KanbanData {
  stages: PipelineStage[];
  deals_by_stage: Record<string, Deal[]>;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  status: string;
  assignee?: User;
}

export type MarketingContentStatus = 'idea' | 'planned' | 'in_progress' | 'ready' | 'published';
export type MarketingContentType = 'post' | 'carousel' | 'reel' | 'story' | 'video';
export type MarketingPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'other';

export interface MarketingContentSubmission {
  title: string;
  brief?: string;
  content_type: MarketingContentType;
  platforms: MarketingPlatform[];
  proposed_date?: string | null;
}

export interface MarketingContentItem extends MarketingContentSubmission {
  id: number;
  status: MarketingContentStatus;
  scheduled_at?: string | null;
  submitted_by?: number;
  assigned_to?: number | null;
  submitter?: User | null;
  assignee?: User | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineSummary {
  stages: {
    stage_name: string;
    deal_count: number;
    total_value: number;
    weighted_value: number;
  }[];
  totals: {
    deal_count: number;
    total_value: number;
    weighted_value: number;
  };
}

export interface ConversionSource {
  source: string;
  total: number;
  converted: number;
  conversion_rate: number;
}

export interface LeaderboardEntry {
  user_id: number;
  name: string;
  deals_won: number;
  revenue: number;
  activity_count: number;
}

export interface Activity {
  id: number;
  type: string;
  subject: string;
  body?: string;
  occurred_at: string;
  owner?: User;
}

export interface AutomationRule {
  id: number;
  name: string;
  trigger_event: string;
  object_type?: string;
  conditions?: unknown[];
  actions: unknown[];
  is_active: boolean;
}

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

export interface EmailAccount {
  id: number;
  provider: string;
  email: string;
  sync_enabled: boolean;
  last_synced_at?: string;
}

export interface CustomReport {
  id: number;
  name: string;
  object_type: string;
  filters?: unknown[];
  group_by?: string[];
  chart_type: string;
}

export interface ForecastData {
  monthly: { month: string; deal_count: number; total_value: number; weighted_value: number }[];
  by_rep: { name: string; deals: number; total: number; weighted: number }[];
  totals: { pipeline: number; weighted: number; deal_count: number };
}

export interface Territory {
  id: number;
  name: string;
  rules?: unknown;
  users?: User[];
}

export interface LeadScoreRule {
  id: number;
  name: string;
  field: string;
  operator: string;
  value?: string;
  points: number;
  is_active: boolean;
}

export interface AnalyticsOverview {
  counts: Record<string, number>;
  revenue: Record<string, number>;
  top_lead_sources: { source: string; count: number }[];
  deal_velocity: number | null;
  enabled_modules?: string[];
  finance?: { outstanding_receivables: number; paid_this_month: number };
  inventory?: { product_count: number; stock_value: number };
  hr?: { active_employees: number; payroll_cost_this_month: number };
  projects?: { active_projects: number; total_budget: number; total_actual_cost: number };
}

export interface AuditLog {
  id: number;
  action: string;
  object_type: string;
  object_id: number;
  created_at: string;
  user?: User;
}

export interface ApiKeyRecord {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at?: string;
}

export interface SmsLog {
  contact_id: number;
  channel: string;
  body: string;
}

export interface Area {
  id: number;
  name: string;
  level: 'region' | 'district' | 'ward' | 'street';
  parent_area_id?: number;
  is_custom?: boolean;
  parent?: Area;
  creator?: User;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
}

export interface Party {
  id: number;
  name: string;
  type?: string;
}

export interface Contract {
  id: number;
  customer_party_id: number;
  service_id: number;
  contact_id?: number;
  amount_paid: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: string;
  party?: Party;
  service?: Service;
  contact?: Contact;
  creator?: User;
}

export interface LeaveType {
  id: number;
  name: string;
  default_days_per_year: number;
  is_paid: boolean;
}

export interface LeaveRequest {
  id: number;
  employee_party_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: string;
  employee_party?: Party;
  leave_type?: LeaveType;
  approved_by?: User;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  expense_category_id: number;
  amount: number;
  currency: string;
  description?: string;
  expense_date?: string;
  expensed_at?: string;
  status: string;
  category?: ExpenseCategory;
  submitter?: User;
  approved_by?: User;
}

export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_party_id: number;
  status: string;
  currency: string;
  total_amount: number;
  amount_paid: number;
  issue_date: string;
  due_date: string;
  party?: Party;
}

export interface FinancialSummary {
  period: { from: string | null; to: string | null };
  revenue: number;
  expenses: number;
  net_income: number;
  by_account_type: Record<string, { total_debit: number; total_credit: number }>;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  unit_price: number;
  currency: string;
  is_active: boolean;
  reorder_point?: number;
}

export interface StockLevel {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  product?: Product;
  warehouse?: { id: number; name: string };
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_party_id: number;
  status: string;
  currency: string;
  total_amount: number;
  order_date: string;
  expected_date?: string;
}

export interface Employee {
  id: number;
  party_id: number;
  department?: string;
  job_title?: string;
  employment_status: string;
  hire_date?: string;
  salary?: number;
  currency?: string;
  party?: Party;
  user?: User;
  manager?: User;
}

export interface PayrollRun {
  id: number;
  period_start: string;
  period_end: string;
  status: string;
  total_amount?: number;
  currency?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  budget?: number;
  actual_cost?: number;
  currency: string;
  status: string;
  start_date?: string;
  end_date?: string;
  manager?: User;
  account?: Account;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  status: string;
  due_date?: string;
  project?: Project;
  assignee?: User;
}

export interface VisitsByAreaReport {
  period: { from: string; to: string };
  level: string;
  visits: {
    area_id: number;
    area_name: string;
    owner_id: number;
    owner_name: string;
    visit_count: number;
  }[];
}

export interface LeadsPerRepReport {
  period: { from: string; to: string };
  leads: {
    owner_id: number;
    owner_name: string;
    date: string;
    lead_count: number;
  }[];
}

export interface ModuleConfig {
  enabled_modules: string[];
  available_modules: string[];
}

export { ApiError };
