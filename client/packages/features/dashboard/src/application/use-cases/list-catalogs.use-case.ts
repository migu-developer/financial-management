import type {
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';

export class ListCurrenciesUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(): Promise<Currency[]> {
    return this.repository.listCurrencies();
  }
}

export class ListExpenseTypesUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(): Promise<ExpenseType[]> {
    return this.repository.listExpenseTypes();
  }
}

export class ListExpenseCategoriesUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(): Promise<ExpenseCategory[]> {
    return this.repository.listExpenseCategories();
  }
}
