import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { DataNotDefinedError } from '@packages/models/shared/utils/errors';

const EXPENSE_COLUMNS = `
  e.id, e.user_id, e.name, e.value, e.currency_id,
  e.expense_type_id, e.expense_category_id,
  e.created_at, e.updated_at, e.created_by, e.modified_by
`.trim();

export class PostgresExpenseRepository implements ExpenseRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findAllByUserUid(uid: string): Promise<Expense[]> {
    return this.dbService.queryReadOnly<Expense>(
      `SELECT ${EXPENSE_COLUMNS}
       FROM financial_management.expenses e
       JOIN financial_management.users u ON e.user_id = u.id
       WHERE u.uid = $1
       ORDER BY e.created_at DESC`,
      [uid],
    );
  }

  async findByIdAndUserUid(id: string, uid: string): Promise<Expense | null> {
    const rows = await this.dbService.queryReadOnly<Expense>(
      `SELECT ${EXPENSE_COLUMNS}
       FROM financial_management.expenses e
       JOIN financial_management.users u ON e.user_id = u.id
       WHERE e.id = $1 AND u.uid = $2`,
      [id, uid],
    );
    return rows[0] ?? null;
  }

  async create(
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    createdBy: string,
  ): Promise<Expense> {
    const rows = await this.dbService.query<Expense>(
      `INSERT INTO financial_management.expenses
         (user_id, name, value, currency_id, expense_type_id, expense_category_id, created_by, modified_by)
       SELECT u.id, $1, $2, $3, $4, $5, $6, $6
       FROM financial_management.users u
       WHERE u.uid = $7
       RETURNING id, user_id, name, value, currency_id, expense_type_id, expense_category_id,
                 created_at, updated_at, created_by, modified_by`,
      [
        input.name,
        input.value,
        input.currency_id,
        input.expense_type_id,
        input.expense_category_id ?? null,
        createdBy,
        uid,
      ],
    );
    if (!rows[0]) throw new DataNotDefinedError('Failed to create expense');
    return rows[0];
  }
}
