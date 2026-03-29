import type {
  CreateExpenseInput,
  ExpenseEntity,
} from '@services/expenses/domain/entities/expense.entity';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class CreateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(
    input: CreateExpenseInput,
    uid: string,
    createdBy: string,
  ): Promise<ExpenseEntity> {
    return this.repository.create(input, uid, createdBy);
  }
}
