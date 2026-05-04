import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';
import { DeleteExpenseUseCase } from './delete-expense.use-case';

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

describe('DeleteExpenseUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: DeleteExpenseUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new DeleteExpenseUseCase(repository);
  });

  it('delegates to repository.deleteExpense with the given id', async () => {
    repository.deleteExpense.mockResolvedValue(undefined);

    await useCase.execute('exp-1');

    expect(repository.deleteExpense).toHaveBeenCalledWith('exp-1');
  });

  it('calls deleteExpense exactly once', async () => {
    repository.deleteExpense.mockResolvedValue(undefined);

    await useCase.execute('exp-42');

    expect(repository.deleteExpense).toHaveBeenCalledTimes(1);
  });

  it('returns void on success', async () => {
    repository.deleteExpense.mockResolvedValue(undefined);

    const result = await useCase.execute('exp-1');

    expect(result).toBeUndefined();
  });

  it('propagates repository errors', async () => {
    repository.deleteExpense.mockRejectedValue(new Error('Expense not found'));

    await expect(useCase.execute('exp-999')).rejects.toThrow(
      'Expense not found',
    );
  });
});
