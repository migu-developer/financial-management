import type {
  Expense,
  CreateExpenseInput,
  PatchExpenseInput,
} from '@packages/models/expenses';

export interface ExpenseRepository {
  findAllByUserUid(uid: string): Promise<Expense[]>;
  findByIdAndUserUid(id: string, uid: string): Promise<Expense | null>;
  create(
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    createdBy: string,
  ): Promise<Expense>;
  update(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense>;
  patch(
    id: string,
    input: PatchExpenseInput,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense>;
  deleteByIdAndUserUid(id: string, uid: string): Promise<void>;
}
