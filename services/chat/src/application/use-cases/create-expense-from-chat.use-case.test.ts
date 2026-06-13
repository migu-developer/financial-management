import { CreateExpenseFromChatUseCase } from './create-expense-from-chat.use-case';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { CurrencyConversionService } from '@services/expenses/domain/services/currency-conversion.service';
import type { Expense } from '@packages/models/expenses';

function makeMockRepo(): jest.Mocked<ExpenseRepository> {
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

function makeMockConversion(): jest.Mocked<CurrencyConversionService> {
  return { convert: jest.fn() };
}

const mockExpense: Expense = {
  id: 'exp-1',
  user_id: 'u-1',
  name: 'Cena',
  value: 45,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
  expense_category_id: null,
  date: '2026-06-15',
  global_value: 45,
  created_at: '2026-06-15T10:00:00Z',
  updated_at: '2026-06-15T10:00:00Z',
  created_by: 'u@test.com',
  modified_by: 'u@test.com',
};

describe('CreateExpenseFromChatUseCase', () => {
  it('delegates to the existing CreateExpenseUseCase with resolved fields', async () => {
    const repo = makeMockRepo();
    const conv = makeMockConversion();
    conv.convert.mockResolvedValue(45);
    repo.create.mockResolvedValue(mockExpense);

    const useCase = new CreateExpenseFromChatUseCase(repo, conv);
    const result = await useCase.execute({
      uid: 'uid-1',
      userEmail: 'u@test.com',
      fields: {
        name: 'Cena',
        value: 45,
        currency_id: 'cur-1',
        expense_type_id: 'type-1',
      },
    });

    expect(conv.convert).toHaveBeenCalledWith('cur-1', 45);
    expect(repo.create).toHaveBeenCalledWith(
      {
        name: 'Cena',
        value: 45,
        currency_id: 'cur-1',
        expense_type_id: 'type-1',
      },
      'uid-1',
      'u@test.com',
      45,
    );
    expect(result).toBe(mockExpense);
  });

  it('forwards optional category and date when present', async () => {
    const repo = makeMockRepo();
    const conv = makeMockConversion();
    conv.convert.mockResolvedValue(45);
    repo.create.mockResolvedValue(mockExpense);

    const useCase = new CreateExpenseFromChatUseCase(repo, conv);
    await useCase.execute({
      uid: 'uid-1',
      userEmail: 'u@test.com',
      fields: {
        name: 'Cena',
        value: 45,
        currency_id: 'cur-1',
        expense_type_id: 'type-1',
        expense_category_id: 'cat-comida',
        date: '2026-06-14',
      },
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expense_category_id: 'cat-comida',
        date: '2026-06-14',
      }),
      'uid-1',
      'u@test.com',
      45,
    );
  });
});
