import type { DatabaseService } from '@services/shared/domain/services/database';
import { trace } from '@services/shared/infrastructure/decorators/trace';

/**
 * Tiny read-only helper to translate user-spoken catalog names (e.g.
 * "comida", "USD", "egreso") into the IDs the existing expense repository
 * methods need. Lookups are case-insensitive and forgiving (LIKE).
 *
 * Lives in the chat service because chat is the only consumer; expenses
 * already has its own id-based repos.
 */
export class CatalogLookupRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('Catalog:findCurrencyIdByCode')
  async findCurrencyIdByCode(code: string): Promise<string | null> {
    const rows = await this.dbService.queryReadOnly<{ id: string }>(
      `SELECT id FROM financial_management.currencies
       WHERE UPPER(code) = UPPER($1) LIMIT 1`,
      [code],
    );
    return rows[0]?.id ?? null;
  }

  @trace('Catalog:findExpenseTypeIdByName')
  async findExpenseTypeIdByName(name: string): Promise<string | null> {
    const rows = await this.dbService.queryReadOnly<{ id: string }>(
      `SELECT id FROM financial_management.expenses_types
       WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name],
    );
    return rows[0]?.id ?? null;
  }

  @trace('Catalog:findCategoryIdByName')
  async findCategoryIdByName(name: string): Promise<string | null> {
    const rows = await this.dbService.queryReadOnly<{ id: string }>(
      `SELECT id FROM financial_management.expenses_categories
       WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name],
    );
    return rows[0]?.id ?? null;
  }
}
