import { ValidateExpenseFieldsUseCase } from './validate-expense-fields.use-case';
import type { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';

function makeMockCatalog(): jest.Mocked<CatalogLookupRepository> {
  return {
    findCurrencyIdByCode: jest.fn(),
    findExpenseTypeIdByName: jest.fn(),
    findCategoryIdByName: jest.fn(),
  } as unknown as jest.Mocked<CatalogLookupRepository>;
}

describe('ValidateExpenseFieldsUseCase', () => {
  it('marks complete when all required fields are present and resolve', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'USD',
      expenseTypeName: 'egreso',
    });

    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.fields).toEqual({
      name: 'Cena',
      value: 45,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
    });
  });

  it('maps Spanish expense type synonyms to catalog names before lookup', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'COP',
      expenseTypeName: 'egreso',
    });
    expect(catalog.findExpenseTypeIdByName).toHaveBeenCalledWith('outcome');

    await useCase.execute({
      name: 'Sueldo',
      value: 100,
      currencyCode: 'COP',
      expenseTypeName: 'Ingreso',
    });
    expect(catalog.findExpenseTypeIdByName).toHaveBeenCalledWith('income');

    await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'COP',
      expenseTypeName: 'outcome',
    });
    expect(catalog.findExpenseTypeIdByName).toHaveBeenCalledWith('outcome');
  });

  it('reports missing when name is absent', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      value: 45,
      currencyCode: 'USD',
      expenseTypeName: 'egreso',
    });

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('descripción');
    expect(result.fields).toBeUndefined();
  });

  it('reports missing when value is zero or negative', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 0,
      currencyCode: 'USD',
      expenseTypeName: 'egreso',
    });

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('monto');
  });

  it('reports missing currency when the code does not exist in the catalog', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue(null);
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'XYZ',
      expenseTypeName: 'egreso',
    });

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('moneda');
  });

  it('reports missing currency when no currency was extracted at all', async () => {
    const catalog = makeMockCatalog();
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 45,
      expenseTypeName: 'egreso',
    });

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('moneda');
  });

  it('reports missing expense type when the name does not resolve', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue(null);
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'USD',
      expenseTypeName: 'wrong',
    });

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('tipo (ingreso o egreso)');
  });

  it('treats category as optional — unknown category does not block', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    catalog.findCategoryIdByName.mockResolvedValue(null);
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'USD',
      expenseTypeName: 'egreso',
      categoryName: 'unknown-cat',
    });

    expect(result.complete).toBe(true);
    expect(result.fields?.expense_category_id).toBeUndefined();
  });

  it('attaches resolved category id when found', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    catalog.findCategoryIdByName.mockResolvedValue('cat-comida');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'USD',
      expenseTypeName: 'egreso',
      categoryName: 'comida',
    });

    expect(result.complete).toBe(true);
    expect(result.fields?.expense_category_id).toBe('cat-comida');
  });

  it('passes through the date when provided', async () => {
    const catalog = makeMockCatalog();
    catalog.findCurrencyIdByCode.mockResolvedValue('cur-1');
    catalog.findExpenseTypeIdByName.mockResolvedValue('type-1');
    const useCase = new ValidateExpenseFieldsUseCase(catalog);

    const result = await useCase.execute({
      name: 'Cena',
      value: 45,
      currencyCode: 'USD',
      expenseTypeName: 'egreso',
      date: '2026-06-15',
    });

    expect(result.fields?.date).toBe('2026-06-15');
  });
});
