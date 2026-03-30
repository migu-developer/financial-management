import type { DatabaseService } from '@services/shared/domain/services/database';
import { FixtureBase } from '@services/shared/test/fixtures/fixture.base';
import {
  ExpenseFactory,
  type ExpenseInput,
} from '@services/expenses/test/factories/expense.factory';

export interface TestExpense {
  id: string;
  user_id: string;
  name: string;
  value: string;
  currency_id: string;
  expense_type_id: string;
  expense_category_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

export class ExpenseFixture extends FixtureBase<ExpenseInput, TestExpense> {
  constructor(
    dbService: DatabaseService,
    private readonly userId: string,
    private readonly createdBy?: string,
  ) {
    super(dbService, new ExpenseFactory());
  }

  async insert(overrides?: Partial<ExpenseInput>): Promise<TestExpense> {
    const data = this.factory.build(overrides);
    const rows = await this.dbService.query<TestExpense>(
      `INSERT INTO financial_management.expenses
         (user_id, name, value, currency_id, expense_type_id, expense_category_id, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [
        this.userId,
        data.name,
        data.value,
        data.currency_id,
        data.expense_type_id,
        data.expense_category_id ?? null,
        this.createdBy ?? null,
      ],
    );
    return rows[0]!;
  }
}
