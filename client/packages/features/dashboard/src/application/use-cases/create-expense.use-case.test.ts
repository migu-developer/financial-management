import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';
import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import { CreateExpenseUseCase } from './create-expense.use-case';

const mockExpense: Expense = {
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Coffee',
  value: 5.5,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
  expense_category_id: 'cat-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  date: '2026-01-01',
  global_value: 5.5,
  created_by: null,
  modified_by: null,
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
    getMetrics: jest.fn(),
  };
}

describe('CreateExpenseUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: CreateExpenseUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new CreateExpenseUseCase(repository);
  });

  it('delegates to repository.createExpense with the given input', async () => {
    const input: Omit<CreateExpenseInput, 'user_id'> = {
      name: 'Coffee',
      value: 5.5,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
      expense_category_id: 'cat-1',
    };
    repository.createExpense.mockResolvedValue(mockExpense);

    const result = await useCase.execute(input);

    expect(repository.createExpense).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockExpense);
  });

  it('handles input without optional expense_category_id', async () => {
    const input: Omit<CreateExpenseInput, 'user_id'> = {
      name: 'Coffee',
      value: 5.5,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
    };
    const expenseWithoutCategory: Expense = {
      ...mockExpense,
      expense_category_id: null,
    };
    repository.createExpense.mockResolvedValue(expenseWithoutCategory);

    const result = await useCase.execute(input);

    expect(repository.createExpense).toHaveBeenCalledWith(input);
    expect(result.expense_category_id).toBeNull();
  });

  it('propagates repository errors', async () => {
    const input: Omit<CreateExpenseInput, 'user_id'> = {
      name: 'Coffee',
      value: 5.5,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
    };
    repository.createExpense.mockRejectedValue(new Error('Validation failed'));

    await expect(useCase.execute(input)).rejects.toThrow('Validation failed');
  });
});
