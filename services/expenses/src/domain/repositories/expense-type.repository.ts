import type { ExpenseTypeEntity } from '@services/expenses/domain/entities/expense-type.entity';

export interface ExpenseTypeRepository {
  findAll(): Promise<ExpenseTypeEntity[]>;
}
