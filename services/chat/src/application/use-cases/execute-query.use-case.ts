import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type {
  Expense,
  ExpenseFilters,
  MetricsFilters,
  MetricsResponse,
} from '@packages/models/expenses';
import type { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';

export interface ExtractedQueryFilters {
  expenseTypeName?: string;
  expenseCategoryName?: string;
  currencyCode?: string;
  from?: string;
  to?: string;
  name?: string;
}

export interface ExecuteQueryInput {
  uid: string;
  queryType: 'list' | 'metrics';
  filters: ExtractedQueryFilters;
  /**
   * Today, in ISO YYYY-MM-DD. Used to fill in default `from`/`to` for
   * metric queries when the user didn't specify a date range.
   */
  today: string;
}

export type ExecuteQueryResult =
  | { kind: 'list'; rows: Expense[] }
  | { kind: 'metrics'; metrics: Omit<MetricsResponse, 'period'> };

interface ResolvedFilters {
  expense_type_id?: string;
  expense_category_id?: string;
  currency_id?: string;
  name?: string;
  from?: string;
  to?: string;
}

/**
 * Resolves catalog names to IDs and delegates to the existing expense
 * repository methods (no duplication of SQL).
 *
 * Tested with a mocked repo + mocked catalog lookup — no live DB needed.
 */
export class ExecuteQueryUseCase {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly catalogLookup: CatalogLookupRepository,
  ) {}

  async execute(input: ExecuteQueryInput): Promise<ExecuteQueryResult> {
    const resolved = await this.resolveFilters(input.filters);

    if (input.queryType === 'metrics') {
      const { from, to } = this.resolveMetricsDateRange(
        resolved.from,
        resolved.to,
        input.today,
      );
      const metricsFilters: MetricsFilters = {
        from,
        to,
        ...(resolved.expense_type_id !== undefined && {
          expense_type_id: resolved.expense_type_id,
        }),
        ...(resolved.expense_category_id !== undefined && {
          expense_category_id: resolved.expense_category_id,
        }),
        ...(resolved.currency_id !== undefined && {
          currency_id: resolved.currency_id,
        }),
      };
      const metrics = await this.expenseRepository.getMetrics(
        input.uid,
        metricsFilters,
      );
      return { kind: 'metrics', metrics };
    }

    const expenseFilters: ExpenseFilters = {
      ...(resolved.expense_type_id !== undefined && {
        expense_type_id: resolved.expense_type_id,
      }),
      ...(resolved.expense_category_id !== undefined && {
        expense_category_id: resolved.expense_category_id,
      }),
      ...(resolved.name !== undefined && { name: resolved.name }),
    };
    const page = await this.expenseRepository.findAllByUserUid(
      input.uid,
      { limit: 20 },
      expenseFilters,
    );
    return { kind: 'list', rows: page.data };
  }

  private async resolveFilters(
    filters: ExtractedQueryFilters,
  ): Promise<ResolvedFilters> {
    const resolved: ResolvedFilters = {};

    if (filters.expenseTypeName) {
      const id = await this.catalogLookup.findExpenseTypeIdByName(
        filters.expenseTypeName,
      );
      if (id) resolved.expense_type_id = id;
    }
    if (filters.expenseCategoryName) {
      const id = await this.catalogLookup.findCategoryIdByName(
        filters.expenseCategoryName,
      );
      if (id) resolved.expense_category_id = id;
    }
    if (filters.currencyCode) {
      const id = await this.catalogLookup.findCurrencyIdByCode(
        filters.currencyCode,
      );
      if (id) resolved.currency_id = id;
    }
    if (filters.name) resolved.name = filters.name;
    if (filters.from) resolved.from = filters.from;
    if (filters.to) resolved.to = filters.to;

    return resolved;
  }

  /**
   * If the user didn't specify a date range, default to the current month
   * (1st of this month → today). `today` is provided by the caller for
   * testability.
   */
  private resolveMetricsDateRange(
    from: string | undefined,
    to: string | undefined,
    today: string,
  ): { from: string; to: string } {
    const monthStart = `${today.slice(0, 7)}-01`;
    return {
      from: from ?? monthStart,
      to: to ?? today,
    };
  }
}
