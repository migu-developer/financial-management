export interface ExpenseFilters {
  expense_type_id?: string;
  expense_category_id?: string;
  name?: string;
}

export function parseExpenseFilters(
  qs: Record<string, string | undefined> | null | undefined,
): ExpenseFilters {
  if (!qs) return {};
  const filters: ExpenseFilters = {};
  if (qs['expense_type_id']) filters.expense_type_id = qs['expense_type_id'];
  if (qs['expense_category_id'])
    filters.expense_category_id = qs['expense_category_id'];
  if (qs['name']) filters.name = qs['name'];
  return filters;
}
