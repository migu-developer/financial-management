export interface Expense {
  id: string;
  user_id: string;
  name: string;
  value: number;
  currency_id: string;
  expense_type_id: string;
  expense_category_id: string | null;
  date: string | null;
  global_value: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateExpenseInput {
  user_id: string;
  name: string;
  value: number;
  currency_id: string;
  expense_type_id: string;
  expense_category_id?: string;
  date?: string;
}

export type UpdateExpenseInput = CreateExpenseInput;

export interface PatchExpenseInput {
  name?: string;
  value?: number;
  currency_id?: string;
  expense_type_id?: string;
  expense_category_id?: string;
  date?: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  country: string;
}

export interface ExpenseType {
  id: string;
  name: 'income' | 'outcome';
  description: string | null;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface MetricsFilters {
  from: string;
  to: string;
  currency_id?: string;
  expense_type_id?: string;
  expense_category_id?: string;
}

export interface MetricsSummary {
  total_income: number;
  total_outcome: number;
  net_balance: number;
  total_transactions: number;
  avg_transaction: number;
}

export interface MetricsByCategory {
  category_id: string;
  category_name: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MetricsByType {
  type_id: string;
  type_name: string;
  total: number;
  count: number;
}

export interface MetricsByCurrency {
  currency_id: string;
  currency_code: string;
  total_original: number;
  total_usd: number;
  count: number;
}

export interface MetricsDailyTrend {
  date: string;
  income: number;
  outcome: number;
}

export interface MetricsTopExpense {
  id: string;
  name: string;
  global_value: number;
  date: string;
  category_name: string | null;
  currency_code: string;
  original_value: number;
}

export interface MetricsResponse {
  period: { from: string; to: string };
  summary: MetricsSummary;
  by_category: MetricsByCategory[];
  by_type: MetricsByType[];
  by_currency: MetricsByCurrency[];
  daily_trend: MetricsDailyTrend[];
  top_expenses: MetricsTopExpense[];
}
