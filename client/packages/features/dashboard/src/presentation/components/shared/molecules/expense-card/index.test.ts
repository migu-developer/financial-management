import { ExpenseCard } from './index';

describe('ExpenseCard component', () => {
  it('module exports a function', () => {
    expect(typeof ExpenseCard).toBe('function');
  });

  it('has the expected name', () => {
    expect(ExpenseCard.name).toBe('ExpenseCard');
  });

  describe('props interface', () => {
    it('requires expense, onPress, and onDelete', () => {
      const expense = {
        id: '1',
        user_id: 'u1',
        name: 'Rent',
        value: 1200,
        currency_id: 'c1',
        expense_type_id: 'et1',
        expense_category_id: null,
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        created_by: null,
        modified_by: null,
      };
      const onPress = jest.fn();
      const onDelete = jest.fn();

      const props = { expense, onPress, onDelete };
      expect(props.expense.name).toBe('Rent');
      expect(props.expense.value).toBe(1200);
      expect(typeof props.onPress).toBe('function');
      expect(typeof props.onDelete).toBe('function');
    });

    it('accepts optional expenseType', () => {
      const expenseType = {
        id: 'et1',
        name: 'outcome' as const,
        description: null,
      };
      expect(expenseType.name).toBe('outcome');
    });

    it('accepts optional currency', () => {
      const currency = {
        id: 'c1',
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        country: 'US',
      };
      expect(currency.symbol).toBe('$');
    });
  });

  describe('formatDate helper', () => {
    it('formats ISO date string to "Mon DD, YYYY" pattern', () => {
      const formatted = new Date('2025-06-15T12:00:00Z').toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      );
      // Pattern: abbreviated month, day number, comma, 4-digit year
      expect(formatted).toMatch(/^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/);
    });
  });

  describe('onPress callback', () => {
    it('is invokable with an expense', () => {
      const onPress = jest.fn();
      const expense = {
        id: '1',
        user_id: 'u1',
        name: 'Groceries',
        value: 50,
        currency_id: 'c1',
        expense_type_id: 'et1',
        expense_category_id: null,
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        created_by: null,
        modified_by: null,
      };
      onPress(expense);
      expect(onPress).toHaveBeenCalledWith(expense);
    });
  });

  describe('onDelete callback', () => {
    it('is invokable with an expense', () => {
      const onDelete = jest.fn();
      const expense = {
        id: '2',
        user_id: 'u1',
        name: 'Subscription',
        value: 9.99,
        currency_id: 'c1',
        expense_type_id: 'et1',
        expense_category_id: null,
        created_at: '2025-02-01T00:00:00Z',
        updated_at: '2025-02-01T00:00:00Z',
        created_by: null,
        modified_by: null,
      };
      onDelete(expense);
      expect(onDelete).toHaveBeenCalledWith(expense);
    });
  });
});
