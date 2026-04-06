import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';
import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import { UpdateExpenseUseCase } from './update-expense.use-case';

const mockExpense: Expense = {
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Updated Groceries',
  value: 75,
  currency_id: 'cur-2',
  expense_type_id: 'type-1',
  expense_category_id: 'cat-2',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
  created_by: null,
  modified_by: 'user-1',
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

describe('UpdateExpenseUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: UpdateExpenseUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new UpdateExpenseUseCase(repository);
  });

  it('delegates to repository.updateExpense with id and input', async () => {
    const input: Omit<CreateExpenseInput, 'user_id'> = {
      name: 'Updated Groceries',
      value: 75,
      currency_id: 'cur-2',
      expense_type_id: 'type-1',
      expense_category_id: 'cat-2',
    };
    repository.updateExpense.mockResolvedValue(mockExpense);

    const result = await useCase.execute('exp-1', input);

    expect(repository.updateExpense).toHaveBeenCalledWith('exp-1', input);
    expect(result).toEqual(mockExpense);
  });

  it('passes the correct id for different expenses', async () => {
    const input: Omit<CreateExpenseInput, 'user_id'> = {
      name: 'Rent',
      value: 1200,
      currency_id: 'cur-1',
      expense_type_id: 'type-2',
    };
    repository.updateExpense.mockResolvedValue({
      ...mockExpense,
      id: 'exp-99',
      name: 'Rent',
    });

    await useCase.execute('exp-99', input);

    expect(repository.updateExpense).toHaveBeenCalledWith('exp-99', input);
  });

  it('propagates repository errors', async () => {
    const input: Omit<CreateExpenseInput, 'user_id'> = {
      name: 'Test',
      value: 10,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
    };
    repository.updateExpense.mockRejectedValue(new Error('Not found'));

    await expect(useCase.execute('exp-1', input)).rejects.toThrow('Not found');
  });
});
