import { AbstractFactory } from '@services/shared/test/factories/factory';

export interface ExpenseInput {
  name: string;
  value: number;
  currency_id: string;
  expense_type_id: string;
  expense_category_id?: string;
}

export class ExpenseFactory extends AbstractFactory<ExpenseInput> {
  build(overrides?: Partial<ExpenseInput>): ExpenseInput {
    return {
      name: 'Test expense',
      value: 10000,
      currency_id: '',
      expense_type_id: '',
      ...overrides,
    };
  }
}
