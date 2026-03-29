import type {
  CreateExpenseInput,
  ExpenseEntity,
} from '@services/expenses/domain/entities/expense.entity';

export interface ExpenseRepository {
  findAllByUserUid(uid: string): Promise<ExpenseEntity[]>;
  findByIdAndUserUid(id: string, uid: string): Promise<ExpenseEntity | null>;
  create(
    input: CreateExpenseInput,
    uid: string,
    createdBy: string,
  ): Promise<ExpenseEntity>;
}
