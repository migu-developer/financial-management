/**
 * Output contracts of the chat prompts — what each Bedrock invocation is
 * instructed to produce. Consumers (Lambdas, use cases) parse the raw LLM
 * output into these shapes.
 */

export type ChatIntent = 'QUERY' | 'CREATE' | 'UNKNOWN';

/**
 * What the SQL-params extraction prompt produces. Catalog values come back
 * as NAMES/CODES (the LLM doesn't know our IDs); the execute-query use case
 * resolves them against the catalogs.
 */
export interface ExtractedQueryFilters {
  expenseTypeName?: string;
  expenseCategoryName?: string;
  currencyCode?: string;
  from?: string;
  to?: string;
  name?: string;
}

export interface ExtractedQueryParams {
  queryType: 'list' | 'metrics';
  filters: ExtractedQueryFilters;
}

/**
 * What the expense-fields extraction prompt produces. Any field can be
 * missing — the validate use case decides whether to ask for clarification.
 */
export interface ExtractedExpenseFields {
  name?: string;
  value?: number;
  currencyCode?: string;
  expenseTypeName?: string;
  categoryName?: string;
  date?: string;
}
