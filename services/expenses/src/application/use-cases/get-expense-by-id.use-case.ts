import type { ExpenseEntity } from '@services/expenses/domain/entities/expense.entity';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import { ModuleNotFoundError } from '@packages/models/shared/utils/errors';

export class GetExpenseByIdUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(id: string, uid: string): Promise<ExpenseEntity> {
    const expense = await this.repository.findByIdAndUserUid(id, uid);
    if (!expense) throw new ModuleNotFoundError();
    return expense;
  }
}
