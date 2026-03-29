import type { Expense, CreateExpenseInput } from '@packages/models/expenses';

export interface ExpenseRepository {
  findAllByUserUid(uid: string): Promise<Expense[]>;
  findByIdAndUserUid(id: string, uid: string): Promise<Expense | null>;
  create(
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    createdBy: string,
  ): Promise<Expense>;
}
