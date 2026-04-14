import type {
  Expense,
  CreateExpenseInput,
  PatchExpenseInput,
  ExpenseFilters,
} from '@packages/models/expenses';
import type {
  PaginationParams,
  PaginatedResult,
} from '@packages/models/shared/pagination';
import {
  decodeCursor,
  buildPaginatedResult,
} from '@packages/models/shared/pagination';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import {
  DataNotDefinedError,
  ModuleNotFoundError,
} from '@packages/models/shared/utils/errors';

const EXPENSE_COLUMNS = `
  e.id, e.user_id, e.name, e.value, e.currency_id,
  e.expense_type_id, e.expense_category_id,
  e.created_at, e.updated_at, e.created_by, e.modified_by
`.trim();

const RETURNING_COLUMNS = `id, user_id, name, value, currency_id, expense_type_id, expense_category_id,
                 created_at, updated_at, created_by, modified_by`;

const USER_SUBQUERY = `(SELECT u.id FROM financial_management.users u WHERE u.uid = `;

export class PostgresExpenseRepository implements ExpenseRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findAllByUserUid(
    uid: string,
    pagination: PaginationParams,
    filters?: ExpenseFilters,
  ): Promise<PaginatedResult<Expense>> {
    const whereClauses = ['u.uid = $1'];
    const params: unknown[] = [uid];
    let paramIndex = 2;

    paramIndex = this.applyFilters(whereClauses, params, paramIndex, filters);

    if (pagination.cursor) {
      const { created_at, id } = decodeCursor(pagination.cursor);
      whereClauses.push(
        `(e.created_at, e.id) < ($${paramIndex++}, $${paramIndex++})`,
      );
      params.push(created_at, id);
    }

    params.push(pagination.limit + 1);

    const rows = await this.dbService.queryReadOnly<Expense>(
      `SELECT ${EXPENSE_COLUMNS}
       FROM financial_management.expenses e
       JOIN financial_management.users u ON e.user_id = u.id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT $${paramIndex}`,
      params,
    );

    const result = buildPaginatedResult(rows, pagination.limit);

    if (!pagination.cursor) {
      result.total_count = await this.countByUserUid(uid, filters);
    }

    return result;
  }

  async countByUserUid(uid: string, filters?: ExpenseFilters): Promise<number> {
    const whereClauses = ['u.uid = $1'];
    const params: unknown[] = [uid];
    this.applyFilters(whereClauses, params, 2, filters);

    const rows = await this.dbService.queryReadOnly<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM financial_management.expenses e
       JOIN financial_management.users u ON e.user_id = u.id
       WHERE ${whereClauses.join(' AND ')}`,
      params,
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  private applyFilters(
    whereClauses: string[],
    params: unknown[],
    startIndex: number,
    filters?: ExpenseFilters,
  ): number {
    let paramIndex = startIndex;
    if (filters?.expense_type_id) {
      whereClauses.push(`e.expense_type_id = $${paramIndex++}`);
      params.push(filters.expense_type_id);
    }
    if (filters?.expense_category_id) {
      whereClauses.push(`e.expense_category_id = $${paramIndex++}`);
      params.push(filters.expense_category_id);
    }
    if (filters?.name) {
      whereClauses.push(`e.name ILIKE '%' || $${paramIndex++} || '%'`);
      params.push(filters.name);
    }
    return paramIndex;
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
       RETURNING ${RETURNING_COLUMNS}`,
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

  async update(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense> {
    const rows = await this.dbService.query<Expense>(
      `UPDATE financial_management.expenses
       SET name = $1, value = $2, currency_id = $3, expense_type_id = $4,
           expense_category_id = $5, modified_by = $6
       WHERE id = $7 AND user_id = ${USER_SUBQUERY}$8)
       RETURNING ${RETURNING_COLUMNS}`,
      [
        input.name,
        input.value,
        input.currency_id,
        input.expense_type_id,
        input.expense_category_id ?? null,
        modifiedBy,
        id,
        uid,
      ],
    );
    if (!rows[0]) throw new ModuleNotFoundError();
    return rows[0];
  }

  async patch(
    id: string,
    input: PatchExpenseInput,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.value !== undefined) {
      setClauses.push(`value = $${paramIndex++}`);
      values.push(input.value);
    }
    if (input.currency_id !== undefined) {
      setClauses.push(`currency_id = $${paramIndex++}`);
      values.push(input.currency_id);
    }
    if (input.expense_type_id !== undefined) {
      setClauses.push(`expense_type_id = $${paramIndex++}`);
      values.push(input.expense_type_id);
    }
    if (input.expense_category_id !== undefined) {
      setClauses.push(`expense_category_id = $${paramIndex++}`);
      values.push(input.expense_category_id);
    }

    setClauses.push(`modified_by = $${paramIndex++}`);
    values.push(modifiedBy);

    const idParam = paramIndex++;
    const uidParam = paramIndex;
    values.push(id, uid);

    const rows = await this.dbService.query<Expense>(
      `UPDATE financial_management.expenses
       SET ${setClauses.join(', ')}
       WHERE id = $${idParam} AND user_id = ${USER_SUBQUERY}$${uidParam})
       RETURNING ${RETURNING_COLUMNS}`,
      values,
    );
    if (!rows[0]) throw new ModuleNotFoundError();
    return rows[0];
  }

  async deleteByIdAndUserUid(id: string, uid: string): Promise<void> {
    const rows = await this.dbService.query<{ id: string }>(
      `DELETE FROM financial_management.expenses
       WHERE id = $1 AND user_id = ${USER_SUBQUERY}$2)
       RETURNING id`,
      [id, uid],
    );
    if (!rows[0]) throw new ModuleNotFoundError();
  }
}
