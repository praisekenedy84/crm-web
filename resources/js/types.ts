import type { PageProps } from '@inertiajs/core'

/**
 * The authenticated user as shared by HandleInertiaRequests.
 * Mirrors AuthenticationService::formatUser() on the PHP side.
 */
export interface SharedUser {
  id: number
  name: string
  email: string
  role: string
  tenant: {
    id: number
    name: string
    slug: string
    default_currency: string
    enabled_modules?: string[]
  } | null
}

export interface SharedPageProps extends PageProps {
  auth: {
    user: SharedUser | null
    permissions: string[]
    scopes: Record<string, 'own' | 'team' | 'all'>
  }
  flash: {
    success: string | null
    error: string | null
  }
  areas: Area[]
}

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
  source_contact_id?: number | null;
  source_contact?: Contact;
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

export interface DealLineItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id?: number | null;
  service_id?: number | null;
  product?: Product;
  service?: Service;
  sort_order?: number;
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
  line_items?: DealLineItem[];
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
  due_time?: string | null;
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

export interface SalesDoneReport {
  period: { from: string; to: string };
  totals: {
    deal_count: number;
    revenue: number;
  };
  sales: {
    id: number;
    name: string;
    value: number;
    currency: string;
    closed_at?: string | null;
    owner_id?: number | null;
    owner_name: string;
    account_name?: string | null;
    contact_name?: string | null;
    lines: {
      id: number;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
      product_id?: number | null;
      product_name?: string | null;
      service_id?: number | null;
      service_name?: string | null;
    }[];
  }[];
}

export interface ModuleConfig {
  enabled_modules: string[];
  available_modules: string[];
}