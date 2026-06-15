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

/**
 * Human-readable version of the resolved fields, for the user-facing preview
 * and confirmation messages. NEVER contains catalog IDs — those leak into the
 * chat as opaque UUIDs otherwise.
 */
export interface ExpenseDisplayFields {
  name: string;
  value: number;
  /** Currency CODE (e.g. "COP"), never the currency id. */
  currency: string;
  /** "ingreso" | "egreso" (or the raw extracted value as a fallback). */
  type: string;
  /** Category NAME, present only when it resolved against the catalog. */
  category?: string;
  /** "YYYY-MM-DD", present only when the user gave a date. */
  date?: string;
}

export interface ValidateExpenseFieldsResult {
  complete: boolean;
  /** When `complete` is true, the resolved fields ready to create. */
  fields?: ResolvedExpenseFields;
  /**
   * When `complete` is true, the same expense in human-readable form for the
   * preview/confirmation prompts (labels, not IDs).
   */
  display?: ExpenseDisplayFields;
  /** When `complete` is false, the friendly names of what is missing. */
  missing: string[];
  /**
   * Valid currency codes from the catalog. Present (possibly empty) whenever
   * `complete` is false, so the clarification prompt can offer the real
   * options instead of suggesting an unsupported one (e.g. USD). Populated
   * only when `moneda` is among the missing fields; `[]` otherwise.
   */
  availableCurrencies?: string[];
  /**
   * The currency code the user provided that the catalog doesn't support
   * (e.g. "USD"), so the clarification can name it explicitly instead of
   * acting as if no currency was given. Present (possibly '') when
   * `complete` is false; '' when no currency was given or it resolved.
   */
  unsupportedCurrency?: string;
}

const FRIENDLY_LABELS = {
  name: 'descripción',
  value: 'monto',
  currency: 'moneda',
  expense_type: 'tipo (ingreso o egreso)',
  date: 'fecha',
} as const;

/** Maps the catalog expense-type name to a Spanish label for the preview. */
function toDisplayExpenseType(name: string): string {
  const catalog = toCatalogExpenseTypeName(name);
  if (catalog === 'income') return 'ingreso';
  if (catalog === 'outcome') return 'egreso';
  return name;
}

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
    // A currency the user named but the catalog doesn't support (e.g. USD).
    const unsupportedCurrency =
      extracted.currencyCode && !currencyId ? extracted.currencyCode : '';

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
      // Surface the catalog currencies only when the currency is what's
      // missing, so the prompt can offer real options (and never re-suggest an
      // unsupported one like USD). Otherwise return an empty array — this
      // avoids a needless query while keeping the field always present, which
      // the Step Functions `States.JsonToString($.validation.availableCurrencies)`
      // reference requires.
      const availableCurrencies = missing.includes(FRIENDLY_LABELS.currency)
        ? await this.catalogLookup.listCurrencyCodes()
        : [];
      return {
        complete: false,
        missing,
        availableCurrencies,
        unsupportedCurrency,
      };
    }

    const fields: ResolvedExpenseFields = {
      name: extracted.name!,
      value: extracted.value!,
      currency_id: currencyId!,
      expense_type_id: expenseTypeId!,
      ...(categoryId !== null && { expense_category_id: categoryId }),
      ...(extracted.date !== undefined && { date: extracted.date }),
    };

    // Human-readable mirror for the preview/confirmation prompts — labels
    // only, so the assistant never echoes catalog UUIDs back to the user.
    const display: ExpenseDisplayFields = {
      name: extracted.name!,
      value: extracted.value!,
      currency: extracted.currencyCode!.toUpperCase(),
      type: toDisplayExpenseType(extracted.expenseTypeName!),
      ...(categoryId !== null &&
        extracted.categoryName && { category: extracted.categoryName }),
      ...(extracted.date !== undefined && { date: extracted.date }),
    };

    return { complete: true, fields, display, missing: [] };
  }
}
