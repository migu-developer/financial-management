import type { Expense, ExpenseFilters } from '@packages/models/expenses';
import type { PaginatedResult } from '@packages/models/shared/pagination';
import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';

export class ListExpensesUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(
    limit?: number,
    cursor?: string,
    signal?: AbortSignal,
    filters?: ExpenseFilters,
  ): Promise<PaginatedResult<Expense>> {
    return this.repository.listExpenses(limit, cursor, signal, filters);
  }
}
