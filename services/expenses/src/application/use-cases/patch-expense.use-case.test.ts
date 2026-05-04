import { PatchExpenseUseCase } from './patch-expense.use-case';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { CurrencyConversionService } from '@services/expenses/domain/services/currency-conversion.service';
import type { Expense, PatchExpenseInput } from '@packages/models/expenses';

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

describe('PatchExpenseUseCase', () => {
  it('does not recalculate global_value when neither value nor currency_id is patched', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.patch.mockResolvedValue({ ...mockExpense, name: 'Patched' });

    const input: PatchExpenseInput = { name: 'Patched' };
    const useCase = new PatchExpenseUseCase(repository, conversionService);
    const result = await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(conversionService.convert).not.toHaveBeenCalled();
    expect(repository.findByIdAndUserUid).not.toHaveBeenCalled();
    expect(repository.patch).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
    );
    expect(result.name).toBe('Patched');
  });

  it('recalculates global_value when value is patched', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.findByIdAndUserUid.mockResolvedValue(mockExpense);
    repository.patch.mockResolvedValue({
      ...mockExpense,
      value: 100000,
      global_value: 24,
    });
    conversionService.convert.mockResolvedValue(24);

    const input: PatchExpenseInput = { value: 100000 };
    const useCase = new PatchExpenseUseCase(repository, conversionService);
    await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(repository.findByIdAndUserUid).toHaveBeenCalledWith(
      'exp-1',
      'uid-1',
    );
    expect(conversionService.convert).toHaveBeenCalledWith('cur-1', 100000);
    expect(repository.patch).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
      24,
    );
  });

  it('recalculates global_value when currency_id is patched', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.findByIdAndUserUid.mockResolvedValue(mockExpense);
    repository.patch.mockResolvedValue({
      ...mockExpense,
      currency_id: 'cur-2',
      global_value: 50,
    });
    conversionService.convert.mockResolvedValue(50);

    const input: PatchExpenseInput = { currency_id: 'cur-2' };
    const useCase = new PatchExpenseUseCase(repository, conversionService);
    await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(conversionService.convert).toHaveBeenCalledWith('cur-2', 50000);
    expect(repository.patch).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
      50,
    );
  });

  it('recalculates global_value when both value and currency_id are patched', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.findByIdAndUserUid.mockResolvedValue(mockExpense);
    repository.patch.mockResolvedValue({
      ...mockExpense,
      value: 200,
      currency_id: 'cur-2',
      global_value: 300,
    });
    conversionService.convert.mockResolvedValue(300);

    const input: PatchExpenseInput = { value: 200, currency_id: 'cur-2' };
    const useCase = new PatchExpenseUseCase(repository, conversionService);
    await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(conversionService.convert).toHaveBeenCalledWith('cur-2', 200);
    expect(repository.patch).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
      300,
    );
  });

  it('falls through to patch without global_value when expense not found', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.findByIdAndUserUid.mockResolvedValue(null);
    repository.patch.mockResolvedValue(mockExpense);

    const input: PatchExpenseInput = { value: 100 };
    const useCase = new PatchExpenseUseCase(repository, conversionService);
    await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(repository.findByIdAndUserUid).toHaveBeenCalledWith(
      'exp-1',
      'uid-1',
    );
    expect(conversionService.convert).not.toHaveBeenCalled();
    expect(repository.patch).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
    );
  });

  it('passes null global_value when conversion returns null', async () => {
    const repository = makeMockRepository();
    const conversionService = makeMockConversionService();
    repository.findByIdAndUserUid.mockResolvedValue(mockExpense);
    repository.patch.mockResolvedValue({
      ...mockExpense,
      global_value: null,
    });
    conversionService.convert.mockResolvedValue(null);

    const input: PatchExpenseInput = { value: 100 };
    const useCase = new PatchExpenseUseCase(repository, conversionService);
    await useCase.execute('exp-1', input, 'uid-1', 'u@test.com');

    expect(repository.patch).toHaveBeenCalledWith(
      'exp-1',
      input,
      'uid-1',
      'u@test.com',
      null,
    );
  });
});
