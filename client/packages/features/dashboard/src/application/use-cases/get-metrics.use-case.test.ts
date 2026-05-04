import type {
  MetricsFilters,
  MetricsResponse,
} from '@packages/models/expenses';
import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';
import { GetMetricsUseCase } from './get-metrics.use-case';

function createMockRepository(): jest.Mocked<ExpenseRepositoryPort> {
  return {
    listExpenses: jest.fn(),
    createExpense: jest.fn(),
    updateExpense: jest.fn(),
    patchExpense: jest.fn(),
    deleteExpense: jest.fn(),
    listCurrencies: jest.fn(),
    listExpenseTypes: jest.fn(),
    listExpenseCategories: jest.fn(),
    getMetrics: jest.fn(),
  };
}

const mockFilters: MetricsFilters = {
  from: '2026-01-01',
  to: '2026-01-31',
};

const mockResponse: MetricsResponse = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  summary: {
    total_income: 5000,
    total_outcome: 3000,
    net_balance: 2000,
    total_transactions: 15,
    avg_transaction: 333.33,
  },
  by_category: [],
  by_type: [],
  by_currency: [],
  daily_trend: [],
  top_expenses: [],
};

describe('GetMetricsUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: GetMetricsUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new GetMetricsUseCase(repository);
  });

  it('delegates to repository.getMetrics with filters', async () => {
    repository.getMetrics.mockResolvedValue(mockResponse);

    const result = await useCase.execute(mockFilters);

    expect(repository.getMetrics).toHaveBeenCalledWith(mockFilters, undefined);
    expect(result).toEqual(mockResponse);
  });

  it('passes AbortSignal to repository', async () => {
    repository.getMetrics.mockResolvedValue(mockResponse);
    const controller = new AbortController();

    await useCase.execute(mockFilters, controller.signal);

    expect(repository.getMetrics).toHaveBeenCalledWith(
      mockFilters,
      controller.signal,
    );
  });

  it('calls getMetrics exactly once', async () => {
    repository.getMetrics.mockResolvedValue(mockResponse);

    await useCase.execute(mockFilters);

    expect(repository.getMetrics).toHaveBeenCalledTimes(1);
  });

  it('propagates repository errors', async () => {
    repository.getMetrics.mockRejectedValue(new Error('Network error'));

    await expect(useCase.execute(mockFilters)).rejects.toThrow('Network error');
  });

  it('passes optional filter fields to repository', async () => {
    repository.getMetrics.mockResolvedValue(mockResponse);
    const filtersWithOptional: MetricsFilters = {
      ...mockFilters,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
      expense_category_id: 'cat-1',
    };

    await useCase.execute(filtersWithOptional);

    expect(repository.getMetrics).toHaveBeenCalledWith(
      filtersWithOptional,
      undefined,
    );
  });
});
