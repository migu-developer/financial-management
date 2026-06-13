import { ExecuteQueryUseCase } from './execute-query.use-case';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';

function makeMockExpenseRepo(): jest.Mocked<ExpenseRepository> {
  return {
    findAllByUserUid: jest.fn(),
    countByUserUid: jest.fn(),
    findByIdAndUserUid: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    deleteByIdAndUserUid: jest.fn(),
    getMetrics: jest.fn(),
  };
}

function makeMockCatalog(): jest.Mocked<CatalogLookupRepository> {
  return {
    findCurrencyIdByCode: jest.fn(),
    findExpenseTypeIdByName: jest.fn(),
    findCategoryIdByName: jest.fn(),
  } as unknown as jest.Mocked<CatalogLookupRepository>;
}

const TODAY = '2026-06-15';

describe('ExecuteQueryUseCase', () => {
  describe('metrics path', () => {
    it('uses current-month range when from/to are missing', async () => {
      const repo = makeMockExpenseRepo();
      const catalog = makeMockCatalog();
      repo.getMetrics.mockResolvedValue({
        summary: {} as never,
        by_category: [],
        by_type: [],
        by_currency: [],
        daily_trend: [],
        top_expenses: [],
      });

      const useCase = new ExecuteQueryUseCase(repo, catalog);
      await useCase.execute({
        uid: 'uid-1',
        queryType: 'metrics',
        filters: {},
        today: TODAY,
      });

      expect(repo.getMetrics).toHaveBeenCalledWith('uid-1', {
        from: '2026-06-01',
        to: TODAY,
      });
    });

    it('uses provided from/to when available', async () => {
      const repo = makeMockExpenseRepo();
      const catalog = makeMockCatalog();
      repo.getMetrics.mockResolvedValue({
        summary: {} as never,
        by_category: [],
        by_type: [],
        by_currency: [],
        daily_trend: [],
        top_expenses: [],
      });

      const useCase = new ExecuteQueryUseCase(repo, catalog);
      await useCase.execute({
        uid: 'uid-1',
        queryType: 'metrics',
        filters: { from: '2026-05-01', to: '2026-05-31' },
        today: TODAY,
      });

      expect(repo.getMetrics).toHaveBeenCalledWith('uid-1', {
        from: '2026-05-01',
        to: '2026-05-31',
      });
    });

    it('resolves expense_type_name and category_name to IDs', async () => {
      const repo = makeMockExpenseRepo();
      const catalog = makeMockCatalog();
      catalog.findExpenseTypeIdByName.mockResolvedValue('type-id-egreso');
      catalog.findCategoryIdByName.mockResolvedValue('cat-id-comida');
      repo.getMetrics.mockResolvedValue({
        summary: {} as never,
        by_category: [],
        by_type: [],
        by_currency: [],
        daily_trend: [],
        top_expenses: [],
      });

      const useCase = new ExecuteQueryUseCase(repo, catalog);
      await useCase.execute({
        uid: 'uid-1',
        queryType: 'metrics',
        filters: {
          expenseTypeName: 'egreso',
          expenseCategoryName: 'comida',
        },
        today: TODAY,
      });

      // Spanish synonym mapped to the English catalog name before lookup.
      expect(catalog.findExpenseTypeIdByName).toHaveBeenCalledWith('outcome');
      expect(catalog.findCategoryIdByName).toHaveBeenCalledWith('comida');
      const filters = (repo.getMetrics.mock.calls[0]?.[1] ?? {}) as Record<
        string,
        unknown
      >;
      expect(filters['expense_type_id']).toBe('type-id-egreso');
      expect(filters['expense_category_id']).toBe('cat-id-comida');
    });

    it('omits filters whose names did not resolve to an ID', async () => {
      const repo = makeMockExpenseRepo();
      const catalog = makeMockCatalog();
      catalog.findExpenseTypeIdByName.mockResolvedValue(null);
      repo.getMetrics.mockResolvedValue({
        summary: {} as never,
        by_category: [],
        by_type: [],
        by_currency: [],
        daily_trend: [],
        top_expenses: [],
      });

      const useCase = new ExecuteQueryUseCase(repo, catalog);
      await useCase.execute({
        uid: 'uid-1',
        queryType: 'metrics',
        filters: { expenseTypeName: 'unknown-name' },
        today: TODAY,
      });

      const filters = (repo.getMetrics.mock.calls[0]?.[1] ?? {}) as Record<
        string,
        unknown
      >;
      expect(filters['expense_type_id']).toBeUndefined();
    });
  });

  describe('list path', () => {
    it('delegates to findAllByUserUid with a 20-item limit', async () => {
      const repo = makeMockExpenseRepo();
      const catalog = makeMockCatalog();
      repo.findAllByUserUid.mockResolvedValue({
        data: [],
        next_cursor: null,
        has_more: false,
      });

      const useCase = new ExecuteQueryUseCase(repo, catalog);
      const result = await useCase.execute({
        uid: 'uid-1',
        queryType: 'list',
        filters: {},
        today: TODAY,
      });

      expect(repo.findAllByUserUid).toHaveBeenCalledWith(
        'uid-1',
        { limit: 20 },
        {},
      );
      expect(result.kind).toBe('list');
    });

    it('forwards the name filter to ExpenseFilters', async () => {
      const repo = makeMockExpenseRepo();
      const catalog = makeMockCatalog();
      repo.findAllByUserUid.mockResolvedValue({
        data: [],
        next_cursor: null,
        has_more: false,
      });

      const useCase = new ExecuteQueryUseCase(repo, catalog);
      await useCase.execute({
        uid: 'uid-1',
        queryType: 'list',
        filters: { name: 'cena' },
        today: TODAY,
      });

      const filters = (repo.findAllByUserUid.mock.calls[0]?.[2] ??
        {}) as Record<string, unknown>;
      expect(filters['name']).toBe('cena');
    });
  });
});
