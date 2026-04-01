import type { Expense, PatchExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class PatchExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(
    id: string,
    input: PatchExpenseInput,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense> {
    return this.repository.patch(id, input, uid, modifiedBy);
  }
}
