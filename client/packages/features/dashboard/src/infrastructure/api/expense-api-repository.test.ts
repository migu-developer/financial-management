import type { ApiClient } from './api-client';
import type {
  Expense,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import { ExpenseApiRepository } from './expense-api-repository';

const mockExpense: Expense = {
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Groceries',
  value: 50,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
  expense_category_id: 'cat-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  created_by: null,
  modified_by: null,
};

function createMockApiClient(): jest.Mocked<ApiClient> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<ApiClient>;
}

describe('ExpenseApiRepository', () => {
  let api: jest.Mocked<ApiClient>;
  let repository: ExpenseApiRepository;

  beforeEach(() => {
    api = createMockApiClient();
    repository = new ExpenseApiRepository(api);
  });

  describe('listExpenses', () => {
    it('calls api.get with /expenses and default limit', async () => {
      api.get.mockResolvedValue({
        success: true,
        data: [mockExpense],
        next_cursor: null,
        has_more: false,
      });

      const result = await repository.listExpenses();

      expect(api.get).toHaveBeenCalledWith('/expenses', { limit: '20' });
      expect(result).toEqual({
        data: [mockExpense],
        next_cursor: null,
        has_more: false,
      });
    });

    it('passes custom limit and cursor as query params', async () => {
      api.get.mockResolvedValue({
        success: true,
        data: [],
        next_cursor: null,
        has_more: false,
      });

      await repository.listExpenses(10, 'cursor-xyz');

      expect(api.get).toHaveBeenCalledWith('/expenses', {
        limit: '10',
        cursor: 'cursor-xyz',
      });
    });

    it('maps response to PaginatedResult with has_more and next_cursor', async () => {
      api.get.mockResolvedValue({
        success: true,
        data: [mockExpense],
        next_cursor: 'next-abc',
        has_more: true,
        total_count: 100,
      });

      const result = await repository.listExpenses(1);

      expect(result.data).toEqual([mockExpense]);
      expect(result.next_cursor).toBe('next-abc');
      expect(result.has_more).toBe(true);
      expect(result.total_count).toBe(100);
    });

    it('defaults next_cursor to null and has_more to false when absent', async () => {
      api.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await repository.listExpenses();

      expect(result.next_cursor).toBeNull();
      expect(result.has_more).toBe(false);
      expect(result.total_count).toBeUndefined();
    });
  });

  describe('createExpense', () => {
    it('calls api.post with /expenses and extracts data', async () => {
      const input = {
        name: 'Coffee',
        value: 5,
        currency_id: 'cur-1',
        expense_type_id: 'type-1',
      };
      api.post.mockResolvedValue({
        success: true,
        data: { ...mockExpense, name: 'Coffee', value: 5 },
      });

      const result = await repository.createExpense(input);

      expect(api.post).toHaveBeenCalledWith('/expenses', input);
      expect(result.name).toBe('Coffee');
      expect(result.value).toBe(5);
    });
  });

  describe('updateExpense', () => {
    it('calls api.put with /expenses/:id and extracts data', async () => {
      const input = {
        name: 'Updated',
        value: 100,
        currency_id: 'cur-2',
        expense_type_id: 'type-1',
      };
      api.put.mockResolvedValue({
        success: true,
        data: { ...mockExpense, name: 'Updated', value: 100 },
      });

      const result = await repository.updateExpense('exp-1', input);

      expect(api.put).toHaveBeenCalledWith('/expenses/exp-1', input);
      expect(result.name).toBe('Updated');
    });
  });

  describe('patchExpense', () => {
    it('calls api.patch with /expenses/:id and extracts data', async () => {
      const input = { value: 75 };
      api.patch.mockResolvedValue({
        success: true,
        data: { ...mockExpense, value: 75 },
      });

      const result = await repository.patchExpense('exp-1', input);

      expect(api.patch).toHaveBeenCalledWith('/expenses/exp-1', input);
      expect(result.value).toBe(75);
    });
  });

  describe('deleteExpense', () => {
    it('calls api.delete with /expenses/:id', async () => {
      api.delete.mockResolvedValue(undefined);

      await repository.deleteExpense('exp-1');

      expect(api.delete).toHaveBeenCalledWith('/expenses/exp-1');
    });

    it('calls the correct path for different IDs', async () => {
      api.delete.mockResolvedValue(undefined);

      await repository.deleteExpense('exp-42');

      expect(api.delete).toHaveBeenCalledWith('/expenses/exp-42');
    });
  });

  describe('listCurrencies', () => {
    it('calls api.get with /currencies and extracts data', async () => {
      const currencies: Currency[] = [
        {
          id: 'cur-1',
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          country: 'US',
        },
      ];
      api.get.mockResolvedValue({ success: true, data: currencies });

      const result = await repository.listCurrencies();

      expect(api.get).toHaveBeenCalledWith('/currencies');
      expect(result).toEqual(currencies);
    });
  });

  describe('listExpenseTypes', () => {
    it('calls api.get with /expenses/types and extracts data', async () => {
      const types: ExpenseType[] = [
        { id: 'type-1', name: 'income', description: 'Income' },
      ];
      api.get.mockResolvedValue({ success: true, data: types });

      const result = await repository.listExpenseTypes();

      expect(api.get).toHaveBeenCalledWith('/expenses/types');
      expect(result).toEqual(types);
    });
  });

  describe('listExpenseCategories', () => {
    it('calls api.get with /expenses/categories and extracts data', async () => {
      const categories: ExpenseCategory[] = [
        { id: 'cat-1', name: 'Food', description: 'Food and beverages' },
      ];
      api.get.mockResolvedValue({ success: true, data: categories });

      const result = await repository.listExpenseCategories();

      expect(api.get).toHaveBeenCalledWith('/expenses/categories');
      expect(result).toEqual(categories);
    });
  });
});
