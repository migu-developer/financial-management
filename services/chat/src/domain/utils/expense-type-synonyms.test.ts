import { toCatalogExpenseTypeName } from './expense-type-synonyms';

describe('toCatalogExpenseTypeName', () => {
  it('maps Spanish synonyms to catalog names', () => {
    expect(toCatalogExpenseTypeName('ingreso')).toBe('income');
    expect(toCatalogExpenseTypeName('egreso')).toBe('outcome');
    expect(toCatalogExpenseTypeName('gasto')).toBe('outcome');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(toCatalogExpenseTypeName(' Ingreso ')).toBe('income');
    expect(toCatalogExpenseTypeName('EGRESO')).toBe('outcome');
  });

  it('passes through values already in catalog form or unknown', () => {
    expect(toCatalogExpenseTypeName('income')).toBe('income');
    expect(toCatalogExpenseTypeName('outcome')).toBe('outcome');
    expect(toCatalogExpenseTypeName('whatever')).toBe('whatever');
  });
});
