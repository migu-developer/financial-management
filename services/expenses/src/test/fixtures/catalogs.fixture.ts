import type { DatabaseService } from '@services/shared/domain/services/database';
import { SeederBase } from '@services/shared/test/fixtures/fixture.base';

export interface TestCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  country: string;
}

export interface TestExpenseType {
  id: string;
  name: 'income' | 'outcome';
  description: string;
}

export interface TestExpenseCategory {
  id: string;
  name: string;
  description: string;
}

export class CurrencySeeder extends SeederBase<TestCurrency> {
  async seed(): Promise<TestCurrency[]> {
    return this.dbService.query<TestCurrency>(
      `INSERT INTO financial_management.currencies (code, name, symbol, country) VALUES
         ('COP', 'Peso Colombiano', '$', 'Colombia'),
         ('USD', 'US Dollar', '$', 'United States')
       RETURNING *`,
    );
  }
}

export class ExpenseTypeSeeder extends SeederBase<TestExpenseType> {
  async seed(): Promise<TestExpenseType[]> {
    return this.dbService.query<TestExpenseType>(
      `INSERT INTO financial_management.expenses_types (name, description) VALUES
         ('income', 'Ingreso de dinero'),
         ('outcome', 'Egreso de dinero')
       RETURNING *`,
    );
  }
}

export class ExpenseCategorySeeder extends SeederBase<TestExpenseCategory> {
  async seed(): Promise<TestExpenseCategory[]> {
    return this.dbService.query<TestExpenseCategory>(
      `INSERT INTO financial_management.expenses_categories (name, description) VALUES
         ('Food', 'Meals and groceries'),
         ('Transport', 'Public transport, fuel')
       RETURNING *`,
    );
  }
}

export async function seedAllCatalogs(dbService: DatabaseService) {
  const [currencies, expenseTypes, expenseCategories] = await Promise.all([
    new CurrencySeeder(dbService).seed(),
    new ExpenseTypeSeeder(dbService).seed(),
    new ExpenseCategorySeeder(dbService).seed(),
  ]);
  return { currencies, expenseTypes, expenseCategories };
}
