import type { Expense } from '@packages/models/expenses';
import type {
  PaginationParams,
  PaginatedResult,
} from '@packages/models/shared/pagination';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class GetExpensesByUserUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(
    uid: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Expense>> {
    return this.repository.findAllByUserUid(uid, pagination);
  }
}
