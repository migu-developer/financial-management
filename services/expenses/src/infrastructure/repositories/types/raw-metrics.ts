export interface RawMetrics {
  summary: {
    total_income: string | number;
    total_outcome: string | number;
    total_transactions: string | number;
    avg_transaction: string | number;
  };
  by_category: RawByCategory[];
  by_type: RawByType[];
  by_currency: RawByCurrency[];
  daily_trend: RawDailyTrend[];
  top_expenses: RawTopExpense[];
}

export interface RawByCategory {
  category_id: string;
  category_name: string;
  total: string | number;
  count: string | number;
}

export interface RawByType {
  type_id: string;
  type_name: string;
  total: string | number;
  count: string | number;
}

export interface RawByCurrency {
  currency_id: string;
  currency_code: string;
  total_original: string | number;
  total_usd: string | number;
  count: string | number;
}

export interface RawDailyTrend {
  date: string;
  income: string | number;
  outcome: string | number;
}

export interface RawTopExpense {
  id: string;
  name: string;
  global_value: string | number;
  date: string;
  category_name: string | null;
  currency_code: string;
  original_value: string | number;
}
