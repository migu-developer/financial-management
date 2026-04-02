import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';
import type { Expense } from '@packages/models/expenses';
import type { PaginatedResult } from '@packages/models/shared/pagination';
import { ListExpensesUseCase } from './list-expenses.use-case';

const mockExpense: Expense = {
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Groceries',
  value: 50,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
  expense_category_id: 'cat-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  created_by: null,
  modified_by: null,
};

const mockPaginatedResult: PaginatedResult<Expense> = {
  data: [mockExpense],
  next_cursor: null,
  has_more: false,
};

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
  };
}

describe('ListExpensesUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: ListExpensesUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new ListExpensesUseCase(repository);
  });

  it('delegates to repository.listExpenses with no arguments', async () => {
    repository.listExpenses.mockResolvedValue(mockPaginatedResult);

    const result = await useCase.execute();

    expect(repository.listExpenses).toHaveBeenCalledWith(undefined, undefined);
    expect(result).toEqual(mockPaginatedResult);
  });

  it('passes limit parameter to repository', async () => {
    repository.listExpenses.mockResolvedValue(mockPaginatedResult);

    await useCase.execute(10);

    expect(repository.listExpenses).toHaveBeenCalledWith(10, undefined);
  });

  it('passes limit and cursor parameters to repository', async () => {
    repository.listExpenses.mockResolvedValue(mockPaginatedResult);

    await useCase.execute(20, 'cursor-abc');

    expect(repository.listExpenses).toHaveBeenCalledWith(20, 'cursor-abc');
  });

  it('returns paginated result with has_more and next_cursor', async () => {
    const paginatedWithMore: PaginatedResult<Expense> = {
      data: [mockExpense],
      next_cursor: 'next-cursor-123',
      has_more: true,
      total_count: 50,
    };
    repository.listExpenses.mockResolvedValue(paginatedWithMore);

    const result = await useCase.execute(1);

    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe('next-cursor-123');
    expect(result.total_count).toBe(50);
  });

  it('propagates repository errors', async () => {
    repository.listExpenses.mockRejectedValue(new Error('Network failure'));

    await expect(useCase.execute()).rejects.toThrow('Network failure');
  });
});
