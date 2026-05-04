import type {
  Expense,
  CreateExpenseInput,
  PatchExpenseInput,
  ExpenseFilters,
  MetricsFilters,
  MetricsSummary,
  MetricsByCategory,
  MetricsByType,
  MetricsByCurrency,
  MetricsDailyTrend,
  MetricsTopExpense,
  MetricsResponse,
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
import { trace } from '@services/shared/infrastructure/decorators/trace';
import type { RawMetrics } from '@services/expenses/infrastructure/repositories/types/raw-metrics';

const EXPENSE_COLUMNS = `
  e.id, e.user_id, e.name, e.value, e.currency_id,
  e.expense_type_id, e.expense_category_id, e.date, e.global_value,
  e.created_at, e.updated_at, e.created_by, e.modified_by
`.trim();

const RETURNING_COLUMNS = `id, user_id, name, value, currency_id, expense_type_id, expense_category_id,
                 date, global_value, created_at, updated_at, created_by, modified_by`;

const USER_SUBQUERY = `(SELECT u.id FROM financial_management.users u WHERE u.uid = `;

export class PostgresExpenseRepository implements ExpenseRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('Expense:findAll')
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

  @trace('Expense:count')
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

  @trace('Expense:findById')
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

  @trace('Expense:create')
  async create(
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    createdBy: string,
    globalValue?: number | null,
  ): Promise<Expense> {
    const rows = await this.dbService.query<Expense>(
      `INSERT INTO financial_management.expenses
         (user_id, name, value, currency_id, expense_type_id, expense_category_id, date, global_value, created_by, modified_by)
       SELECT u.id, $1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8, $8
       FROM financial_management.users u
       WHERE u.uid = $9
       RETURNING ${RETURNING_COLUMNS}`,
      [
        input.name,
        input.value,
        input.currency_id,
        input.expense_type_id,
        input.expense_category_id ?? null,
        input.date ?? null,
        globalValue ?? null,
        createdBy,
        uid,
      ],
    );
    if (!rows[0]) throw new DataNotDefinedError('Failed to create expense');
    return rows[0];
  }

  @trace('Expense:update')
  async update(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    modifiedBy: string,
    globalValue?: number | null,
  ): Promise<Expense> {
    const rows = await this.dbService.query<Expense>(
      `UPDATE financial_management.expenses
       SET name = $1, value = $2, currency_id = $3, expense_type_id = $4,
           expense_category_id = $5, date = COALESCE($6::date, CURRENT_DATE),
           global_value = $7, modified_by = $8
       WHERE id = $9 AND user_id = ${USER_SUBQUERY}$10)
       RETURNING ${RETURNING_COLUMNS}`,
      [
        input.name,
        input.value,
        input.currency_id,
        input.expense_type_id,
        input.expense_category_id ?? null,
        input.date ?? null,
        globalValue ?? null,
        modifiedBy,
        id,
        uid,
      ],
    );
    if (!rows[0]) throw new ModuleNotFoundError();
    return rows[0];
  }

  @trace('Expense:patch')
  async patch(
    id: string,
    input: PatchExpenseInput,
    uid: string,
    modifiedBy: string,
    globalValue?: number | null,
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
    if (input.date !== undefined) {
      setClauses.push(`date = $${paramIndex++}::date`);
      values.push(input.date);
    }
    if (globalValue !== undefined) {
      setClauses.push(`global_value = $${paramIndex++}`);
      values.push(globalValue);
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

  @trace('Expense:delete')
  async deleteByIdAndUserUid(id: string, uid: string): Promise<void> {
    const rows = await this.dbService.query<{ id: string }>(
      `DELETE FROM financial_management.expenses
       WHERE id = $1 AND user_id = ${USER_SUBQUERY}$2)
       RETURNING id`,
      [id, uid],
    );
    if (!rows[0]) throw new ModuleNotFoundError();
  }

  @trace('Expense:getMetrics')
  async getMetrics(
    uid: string,
    filters: MetricsFilters,
  ): Promise<Omit<MetricsResponse, 'period'>> {
    const whereClauses = ['u.uid = $1', 'e.date BETWEEN $2 AND $3'];
    const params: unknown[] = [uid, filters.from, filters.to];
    let paramIndex = 4;

    if (filters.currency_id) {
      whereClauses.push(`e.currency_id = $${paramIndex++}`);
      params.push(filters.currency_id);
    }
    if (filters.expense_type_id) {
      whereClauses.push(`e.expense_type_id = $${paramIndex++}`);
      params.push(filters.expense_type_id);
    }
    if (filters.expense_category_id) {
      whereClauses.push(`e.expense_category_id = $${paramIndex++}`);
      params.push(filters.expense_category_id);
    }

    const whereClause = whereClauses.join(' AND ');

    const sql = `
      WITH user_expenses AS (
        SELECT e.*, et.name as type_name, ec.name as category_name, c.code as currency_code
        FROM financial_management.expenses e
        JOIN financial_management.users u ON e.user_id = u.id
        LEFT JOIN financial_management.expenses_types et ON et.id = e.expense_type_id
        LEFT JOIN financial_management.expenses_categories ec ON ec.id = e.expense_category_id
        LEFT JOIN financial_management.currencies c ON c.id = e.currency_id
        WHERE ${whereClause}
      ),
      summary AS (
        SELECT
          COALESCE(SUM(CASE WHEN type_name = 'income' THEN global_value ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type_name = 'outcome' THEN global_value ELSE 0 END), 0) as total_outcome,
          COUNT(*)::int as total_transactions,
          COALESCE(AVG(global_value), 0) as avg_transaction
        FROM user_expenses
      ),
      by_category AS (
        SELECT expense_category_id as category_id, category_name,
          COALESCE(SUM(global_value), 0) as total, COUNT(*)::int as count
        FROM user_expenses WHERE type_name = 'outcome' AND expense_category_id IS NOT NULL
        GROUP BY expense_category_id, category_name ORDER BY total DESC
      ),
      by_type AS (
        SELECT expense_type_id as type_id, type_name,
          COALESCE(SUM(global_value), 0) as total, COUNT(*)::int as count
        FROM user_expenses GROUP BY expense_type_id, type_name
      ),
      by_currency AS (
        SELECT currency_id, currency_code,
          COALESCE(SUM(value), 0) as total_original,
          COALESCE(SUM(global_value), 0) as total_usd, COUNT(*)::int as count
        FROM user_expenses GROUP BY currency_id, currency_code ORDER BY total_usd DESC
      ),
      daily_trend AS (
        SELECT date,
          COALESCE(SUM(CASE WHEN type_name = 'income' THEN global_value ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type_name = 'outcome' THEN global_value ELSE 0 END), 0) as outcome
        FROM user_expenses WHERE date IS NOT NULL GROUP BY date ORDER BY date ASC
      ),
      top_expenses AS (
        SELECT id, name, global_value, date, category_name, currency_code, value as original_value
        FROM user_expenses WHERE type_name = 'outcome' AND global_value IS NOT NULL
        ORDER BY global_value DESC LIMIT 5
      )
      SELECT json_build_object(
        'summary', (SELECT row_to_json(s) FROM summary s),
        'by_category', (SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) FROM by_category c),
        'by_type', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM by_type t),
        'by_currency', (SELECT COALESCE(json_agg(row_to_json(cu)), '[]'::json) FROM by_currency cu),
        'daily_trend', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json) FROM daily_trend d),
        'top_expenses', (SELECT COALESCE(json_agg(row_to_json(te)), '[]'::json) FROM top_expenses te)
      ) as metrics
    `;

    const rows = await this.dbService.queryReadOnly<{ metrics: string }>(
      sql,
      params,
    );

    const raw = rows[0]?.metrics;
    const metrics =
      typeof raw === 'string'
        ? (JSON.parse(raw) as RawMetrics)
        : (raw as unknown as RawMetrics);

    const summary: MetricsSummary = {
      total_income: Number(metrics.summary.total_income),
      total_outcome: Number(metrics.summary.total_outcome),
      net_balance:
        Number(metrics.summary.total_income) -
        Number(metrics.summary.total_outcome),
      total_transactions: Number(metrics.summary.total_transactions),
      avg_transaction: Number(metrics.summary.avg_transaction),
    };

    const totalOutcome = summary.total_outcome;

    const by_category: MetricsByCategory[] = metrics.by_category.map((c) => ({
      category_id: String(c.category_id),
      category_name: String(c.category_name),
      total: Number(c.total),
      count: Number(c.count),
      percentage: totalOutcome > 0 ? (Number(c.total) / totalOutcome) * 100 : 0,
    }));

    const by_type: MetricsByType[] = metrics.by_type.map((t) => ({
      type_id: String(t.type_id),
      type_name: String(t.type_name),
      total: Number(t.total),
      count: Number(t.count),
    }));

    const by_currency: MetricsByCurrency[] = metrics.by_currency.map((cu) => ({
      currency_id: String(cu.currency_id),
      currency_code: String(cu.currency_code),
      total_original: Number(cu.total_original),
      total_usd: Number(cu.total_usd),
      count: Number(cu.count),
    }));

    const daily_trend: MetricsDailyTrend[] = metrics.daily_trend.map((d) => ({
      date: String(d.date),
      income: Number(d.income),
      outcome: Number(d.outcome),
    }));

    const top_expenses: MetricsTopExpense[] = metrics.top_expenses.map(
      (te) => ({
        id: String(te.id),
        name: String(te.name),
        global_value: Number(te.global_value),
        date: String(te.date),
        category_name: te.category_name ? String(te.category_name) : null,
        currency_code: String(te.currency_code),
        original_value: Number(te.original_value),
      }),
    );

    return {
      summary,
      by_category,
      by_type,
      by_currency,
      daily_trend,
      top_expenses,
    };
  }
}
