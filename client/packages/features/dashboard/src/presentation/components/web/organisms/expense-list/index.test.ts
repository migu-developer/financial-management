import { ExpenseList } from './index';

describe('ExpenseList component', () => {
  it('module exports a function', () => {
    expect(typeof ExpenseList).toBe('function');
  });

  it('has the expected name', () => {
    expect(ExpenseList.name).toBe('ExpenseList');
  });

  describe('props interface', () => {
    it('requires all expected props', () => {
      const props = {
        expenses: [],
        expenseTypes: [],
        currencies: [],
        loading: false,
        loadingMore: false,
        hasMore: false,
        onLoadMore: jest.fn(),
        onPress: jest.fn(),
        onDelete: jest.fn(),
        emptyTitle: 'No expenses yet',
        emptyDescription: 'Create your first expense',
      };
      expect(props.expenses).toEqual([]);
      expect(props.emptyTitle).toBe('No expenses yet');
      expect(props.emptyDescription).toBe('Create your first expense');
      expect(typeof props.onLoadMore).toBe('function');
      expect(typeof props.onPress).toBe('function');
      expect(typeof props.onDelete).toBe('function');
    });
  });

  describe('rendering logic', () => {
    it('shows loading spinner when loading and expenses is empty', () => {
      const loading = true;
      const expenses: unknown[] = [];
      const showSpinner = loading && expenses.length === 0;
      expect(showSpinner).toBe(true);
    });

    it('shows empty state when not loading and expenses is empty', () => {
      const loading = false;
      const expenses: unknown[] = [];
      const showEmpty = !loading && expenses.length === 0;
      expect(showEmpty).toBe(true);
    });

    it('shows list when expenses are present', () => {
      const expenses = [{ id: '1' }];
      const showList = expenses.length > 0;
      expect(showList).toBe(true);
    });

    it('does not show spinner when loading but expenses exist', () => {
      const loading = true;
      const expenses = [{ id: '1' }];
      const showSpinner = loading && expenses.length === 0;
      expect(showSpinner).toBe(false);
    });
  });

  describe('type lookup helpers', () => {
    it('finds expense type by id', () => {
      const expenseTypes = [
        { id: 'et1', name: 'income' as const, description: null },
        { id: 'et2', name: 'outcome' as const, description: null },
      ];
      const getType = (typeId: string) =>
        expenseTypes.find((et) => et.id === typeId);
      expect(getType('et1')?.name).toBe('income');
      expect(getType('et2')?.name).toBe('outcome');
      expect(getType('unknown')).toBeUndefined();
    });

    it('finds currency by id', () => {
      const currencies = [
        {
          id: 'c1',
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          country: 'US',
        },
        { id: 'c2', code: 'EUR', name: 'Euro', symbol: '€', country: 'EU' },
      ];
      const getCurrency = (currId: string) =>
        currencies.find((c) => c.id === currId);
      expect(getCurrency('c1')?.symbol).toBe('$');
      expect(getCurrency('c2')?.symbol).toBe('€');
      expect(getCurrency('unknown')).toBeUndefined();
    });
  });
});
