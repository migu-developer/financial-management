import type {
  Expense,
  CreateExpenseInput,
  PatchExpenseInput,
  ExpenseFilters,
  MetricsFilters,
  MetricsResponse,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import type { PaginatedResult } from '@packages/models/shared/pagination';
import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';
import type { ApiClient } from './api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  next_cursor?: string | null;
  has_more?: boolean;
  total_count?: number;
}

export class ExpenseApiRepository implements ExpenseRepositoryPort {
  constructor(private readonly api: ApiClient) {}

  async listExpenses(
    limit = 20,
    cursor?: string,
    signal?: AbortSignal,
    filters?: ExpenseFilters,
  ): Promise<PaginatedResult<Expense>> {
    const params: Record<string, string> = { limit: String(limit) };
    if (cursor) params['cursor'] = cursor;
    if (filters?.expense_type_id)
      params['expense_type_id'] = filters.expense_type_id;
    if (filters?.expense_category_id)
      params['expense_category_id'] = filters.expense_category_id;
    if (filters?.name) params['name'] = filters.name;

    const response = await this.api.get<ApiResponse<Expense[]>>(
      '/expenses',
      params,
      signal,
    );

    return {
      data: response.data,
      next_cursor: response.next_cursor ?? null,
      has_more: response.has_more ?? false,
      ...(response.total_count !== undefined && {
        total_count: response.total_count,
      }),
    };
  }

  async createExpense(
    input: Omit<CreateExpenseInput, 'user_id'>,
  ): Promise<Expense> {
    const response = await this.api.post<ApiResponse<Expense>>(
      '/expenses',
      input,
    );
    return response.data;
  }

  async updateExpense(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
  ): Promise<Expense> {
    const response = await this.api.put<ApiResponse<Expense>>(
      `/expenses/${id}`,
      input,
    );
    return response.data;
  }

  async patchExpense(id: string, input: PatchExpenseInput): Promise<Expense> {
    const response = await this.api.patch<ApiResponse<Expense>>(
      `/expenses/${id}`,
      input,
    );
    return response.data;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.api.delete(`/expenses/${id}`);
  }

  async listCurrencies(): Promise<Currency[]> {
    const response = await this.api.get<ApiResponse<Currency[]>>('/currencies');
    return response.data;
  }

  async listExpenseTypes(): Promise<ExpenseType[]> {
    const response =
      await this.api.get<ApiResponse<ExpenseType[]>>('/expenses/types');
    return response.data;
  }

  async listExpenseCategories(): Promise<ExpenseCategory[]> {
    const response = await this.api.get<ApiResponse<ExpenseCategory[]>>(
      '/expenses/categories',
    );
    return response.data;
  }

  async getMetrics(
    filters: MetricsFilters,
    signal?: AbortSignal,
  ): Promise<MetricsResponse> {
    const params: Record<string, string> = {
      from: filters.from,
      to: filters.to,
    };
    if (filters.currency_id) params['currency_id'] = filters.currency_id;
    if (filters.expense_type_id)
      params['expense_type_id'] = filters.expense_type_id;
    if (filters.expense_category_id)
      params['expense_category_id'] = filters.expense_category_id;

    const response = await this.api.get<ApiResponse<MetricsResponse>>(
      '/expenses/metrics',
      params,
      signal,
    );
    return response.data;
  }
}
