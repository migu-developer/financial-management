import { GetMetricsUseCase } from './get-metrics.use-case';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type {
  MetricsFilters,
  MetricsResponse,
} from '@packages/models/expenses';

function makeMockRepository(): jest.Mocked<ExpenseRepository> {
  return {
    findAllByUserUid: jest.fn(),
    countByUserUid: jest.fn(),
    findByIdAndUserUid: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    deleteByIdAndUserUid: jest.fn(),
    getMetrics: jest.fn(),
  };
}

const mockMetricsResult: Omit<MetricsResponse, 'period'> = {
  summary: {
    total_income: 5000,
    total_outcome: 3000,
    net_balance: 2000,
    total_transactions: 10,
    avg_transaction: 800,
  },
  by_category: [
    {
      category_id: 'cat-1',
      category_name: 'Food',
      total: 1500,
      count: 5,
      percentage: 50,
    },
    {
      category_id: 'cat-2',
      category_name: 'Transport',
      total: 1500,
      count: 5,
      percentage: 50,
    },
  ],
  by_type: [
    { type_id: 'type-1', type_name: 'income', total: 5000, count: 3 },
    { type_id: 'type-2', type_name: 'outcome', total: 3000, count: 7 },
  ],
  by_currency: [
    {
      currency_id: 'cur-1',
      currency_code: 'USD',
      total_original: 3000,
      total_usd: 3000,
      count: 5,
    },
  ],
  daily_trend: [
    { date: '2024-01-01', income: 1000, outcome: 500 },
    { date: '2024-01-02', income: 0, outcome: 200 },
  ],
  top_expenses: [
    {
      id: 'exp-1',
      name: 'Rent',
      global_value: 1200,
      date: '2024-01-01',
      category_name: 'Housing',
      currency_code: 'USD',
      original_value: 1200,
    },
  ],
};

describe('GetMetricsUseCase', () => {
  it('returns metrics with period from filters', async () => {
    const repository = makeMockRepository();
    repository.getMetrics.mockResolvedValue(mockMetricsResult);

    const filters: MetricsFilters = { from: '2024-01-01', to: '2024-01-31' };
    const useCase = new GetMetricsUseCase(repository);
    const result = await useCase.execute('uid-1', filters);

    expect(repository.getMetrics).toHaveBeenCalledWith('uid-1', filters);
    expect(result.period).toEqual({ from: '2024-01-01', to: '2024-01-31' });
    expect(result.summary).toEqual(mockMetricsResult.summary);
    expect(result.by_category).toEqual(mockMetricsResult.by_category);
    expect(result.by_type).toEqual(mockMetricsResult.by_type);
    expect(result.by_currency).toEqual(mockMetricsResult.by_currency);
    expect(result.daily_trend).toEqual(mockMetricsResult.daily_trend);
    expect(result.top_expenses).toEqual(mockMetricsResult.top_expenses);
  });

  it('passes optional filters to repository', async () => {
    const repository = makeMockRepository();
    repository.getMetrics.mockResolvedValue(mockMetricsResult);

    const filters: MetricsFilters = {
      from: '2024-01-01',
      to: '2024-01-31',
      currency_id: 'cur-1',
      expense_type_id: 'type-2',
      expense_category_id: 'cat-1',
    };
    const useCase = new GetMetricsUseCase(repository);
    await useCase.execute('uid-1', filters);

    expect(repository.getMetrics).toHaveBeenCalledWith('uid-1', filters);
  });

  it('propagates repository errors', async () => {
    const repository = makeMockRepository();
    repository.getMetrics.mockRejectedValue(new Error('DB error'));

    const filters: MetricsFilters = { from: '2024-01-01', to: '2024-01-31' };
    const useCase = new GetMetricsUseCase(repository);

    await expect(useCase.execute('uid-1', filters)).rejects.toThrow('DB error');
  });
});
