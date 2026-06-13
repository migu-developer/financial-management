/**
 * The expenses_types catalog stores English names (income/outcome) but the
 * extraction prompts speak Spanish (ingreso/egreso). Map synonyms to the
 * catalog name before lookup; unknown values pass through unchanged.
 *
 * Used by BOTH branches: validate-expense-fields (CREATE) and
 * execute-query (QUERY filters).
 */
const EXPENSE_TYPE_SYNONYMS: Record<string, string> = {
  ingreso: 'income',
  egreso: 'outcome',
  gasto: 'outcome',
};

export function toCatalogExpenseTypeName(name: string): string {
  return EXPENSE_TYPE_SYNONYMS[name.trim().toLowerCase()] ?? name;
}
