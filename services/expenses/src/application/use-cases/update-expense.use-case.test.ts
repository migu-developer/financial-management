import { UpdateExpenseUseCase } from './update-expense.use-case';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { CurrencyConversionService } from '@services/expenses/domain/services/currency-conversion.service';
import type { Expense, CreateExpenseInput } from '@packages/models/expenses';

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

function makeMockConversionService(): jest.Mocked<CurrencyConversionService> {
  return {
    convert: jest.fn(),
  };
}

const mockExpense: Expense = {
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Groceries',
  value: 50000,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
  expense_category_id: null,
  date: '2024-01-15',
  global_value: 12,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'u@test.com',
  modified_by: 'u@test.com',
};

const input: Omit<CreateExpenseInput, 'user_id'> = {
  name: 'Groceries',
  value: 50000,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
};

describe('UpdateExpenseUseCase', () => {
  it('converts currency and passes global_value to repository', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.update.mockResolvedValue(mockExpense);
    conversionService.convert.mockResolvedValue(12);

    const useCase = new UpdateExpenseUseCase(repository, conversionService);
    const result = await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(conversionService.convert).toHaveBeenCalledWith('cur-1', 50000);
    expect(repository.update).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
      12,
    );
    expect(result).toEqual(mockExpense);
  });

  it('passes null global_value when conversion returns null', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.update.mockResolvedValue({ ...mockExpense, global_value: null });
    conversionService.convert.mockResolvedValue(null);

    const useCase = new UpdateExpenseUseCase(repository, conversionService);
    await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(repository.update).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
      null,
    );
  });

  it('passes date from input through to repository', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.update.mockResolvedValue(mockExpense);
    conversionService.convert.mockResolvedValue(12);

    const inputWithDate = { ...input, date: '2024-06-15' };
    const useCase = new UpdateExpenseUseCase(repository, conversionService);
    await useCase.execute('exp-1', inputWithDate, 'uid-1', 'u@test.com');

    expect(repository.update).toHaveBeenCalledWith(
      'exp-1',
      inputWithDate,
      'uid-1',
      'u@test.com',
      12,
    );
  });
});
