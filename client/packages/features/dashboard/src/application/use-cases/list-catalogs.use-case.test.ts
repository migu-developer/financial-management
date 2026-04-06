import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';
import type {
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import {
  ListCurrenciesUseCase,
  ListExpenseTypesUseCase,
  ListExpenseCategoriesUseCase,
} from './list-catalogs.use-case';

const mockCurrencies: Currency[] = [
  { id: 'cur-1', code: 'USD', name: 'US Dollar', symbol: '$', country: 'US' },
  { id: 'cur-2', code: 'EUR', name: 'Euro', symbol: '\u20AC', country: 'EU' },
];

const mockExpenseTypes: ExpenseType[] = [
  { id: 'type-1', name: 'income', description: 'Income' },
  { id: 'type-2', name: 'outcome', description: 'Outcome' },
];

const mockExpenseCategories: ExpenseCategory[] = [
  { id: 'cat-1', name: 'Food', description: 'Food and beverages' },
  { id: 'cat-2', name: 'Transport', description: null },
];

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

describe('ListCurrenciesUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: ListCurrenciesUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new ListCurrenciesUseCase(repository);
  });

  it('delegates to repository.listCurrencies', async () => {
    repository.listCurrencies.mockResolvedValue(mockCurrencies);

    const result = await useCase.execute();

    expect(repository.listCurrencies).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockCurrencies);
  });

  it('returns empty array when no currencies exist', async () => {
    repository.listCurrencies.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('propagates repository errors', async () => {
    repository.listCurrencies.mockRejectedValue(new Error('Service down'));

    await expect(useCase.execute()).rejects.toThrow('Service down');
  });
});

describe('ListExpenseTypesUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: ListExpenseTypesUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new ListExpenseTypesUseCase(repository);
  });

  it('delegates to repository.listExpenseTypes', async () => {
    repository.listExpenseTypes.mockResolvedValue(mockExpenseTypes);

    const result = await useCase.execute();

    expect(repository.listExpenseTypes).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockExpenseTypes);
  });

  it('returns empty array when no expense types exist', async () => {
    repository.listExpenseTypes.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('propagates repository errors', async () => {
    repository.listExpenseTypes.mockRejectedValue(new Error('Timeout'));

    await expect(useCase.execute()).rejects.toThrow('Timeout');
  });
});

describe('ListExpenseCategoriesUseCase', () => {
  let repository: jest.Mocked<ExpenseRepositoryPort>;
  let useCase: ListExpenseCategoriesUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new ListExpenseCategoriesUseCase(repository);
  });

  it('delegates to repository.listExpenseCategories', async () => {
    repository.listExpenseCategories.mockResolvedValue(mockExpenseCategories);

    const result = await useCase.execute();

    expect(repository.listExpenseCategories).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockExpenseCategories);
  });

  it('returns empty array when no categories exist', async () => {
    repository.listExpenseCategories.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('propagates repository errors', async () => {
    repository.listExpenseCategories.mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(useCase.execute()).rejects.toThrow('Connection refused');
  });
});
