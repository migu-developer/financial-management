import type { ExtractedExpenseFields } from '@packages/prompts/chat/contracts';
import type { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';
import { toCatalogExpenseTypeName } from '@services/chat/domain/utils/expense-type-synonyms';

export type { ExtractedExpenseFields };

/**
 * Same fields with catalog IDs resolved (so the create use case can be
 * called directly with the existing repository contract).
 */
export interface ResolvedExpenseFields {
  name: string;
  value: number;
  currency_id: string;
  expense_type_id: string;
  expense_category_id?: string;
  date?: string;
}

export interface ValidateExpenseFieldsResult {
  complete: boolean;
  /** When `complete` is true, the resolved fields ready to create. */
  fields?: ResolvedExpenseFields;
  /** When `complete` is false, the friendly names of what is missing. */
  missing: string[];
}

const FRIENDLY_LABELS = {
  name: 'descripción',
  value: 'monto',
  currency: 'moneda',
  expense_type: 'tipo (ingreso o egreso)',
  date: 'fecha',
} as const;

/**
 * Validates the AI-extracted fields:
 *   - name, value, currency, expense_type must all be present.
 *   - Catalog names (currency code, expense type, category) get resolved
 *     to IDs. If a name doesn't exist in our catalog, we treat it as missing.
 *   - category is OPTIONAL (matches DB schema; FK is nullable).
 *   - date is optional and defaults to today at the repository layer.
 */
export class ValidateExpenseFieldsUseCase {
  constructor(private readonly catalogLookup: CatalogLookupRepository) {}

  async execute(
    extracted: ExtractedExpenseFields,
  ): Promise<ValidateExpenseFieldsResult> {
    const missing: string[] = [];

    if (!extracted.name) missing.push(FRIENDLY_LABELS.name);
    if (typeof extracted.value !== 'number' || extracted.value <= 0) {
      missing.push(FRIENDLY_LABELS.value);
    }

    let currencyId: string | null = null;
    if (extracted.currencyCode) {
      currencyId = await this.catalogLookup.findCurrencyIdByCode(
        extracted.currencyCode,
      );
    }
    if (!currencyId) missing.push(FRIENDLY_LABELS.currency);

    let expenseTypeId: string | null = null;
    if (extracted.expenseTypeName) {
      expenseTypeId = await this.catalogLookup.findExpenseTypeIdByName(
        toCatalogExpenseTypeName(extracted.expenseTypeName),
      );
    }
    if (!expenseTypeId) missing.push(FRIENDLY_LABELS.expense_type);

    let categoryId: string | null = null;
    if (extracted.categoryName) {
      categoryId = await this.catalogLookup.findCategoryIdByName(
        extracted.categoryName,
      );
      // Category is optional — if the name doesn't resolve, just skip it,
      // don't fail validation.
    }

    if (missing.length > 0) {
      return { complete: false, missing };
    }

    const fields: ResolvedExpenseFields = {
      name: extracted.name!,
      value: extracted.value!,
      currency_id: currencyId!,
      expense_type_id: expenseTypeId!,
      ...(categoryId !== null && { expense_category_id: categoryId }),
      ...(extracted.date !== undefined && { date: extracted.date }),
    };

    return { complete: true, fields, missing: [] };
  }
}
