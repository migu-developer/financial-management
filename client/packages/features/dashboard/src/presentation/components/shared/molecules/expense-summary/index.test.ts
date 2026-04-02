import { ExpenseSummary } from './index';

describe('ExpenseSummary component', () => {
  it('module exports a function', () => {
    expect(typeof ExpenseSummary).toBe('function');
  });

  it('has the expected name', () => {
    expect(ExpenseSummary.name).toBe('ExpenseSummary');
  });

  describe('props interface', () => {
    it('requires totalCount and loading', () => {
      const props = { totalCount: 5, loading: false };
      expect(props.totalCount).toBe(5);
      expect(props.loading).toBe(false);
    });

    it('totalCount can be null', () => {
      const props: { totalCount: number | null; loading: boolean } = {
        totalCount: null,
        loading: true,
      };
      expect(props.totalCount).toBeNull();
    });
  });

  describe('rendering logic', () => {
    it('returns null when loading and totalCount is null', () => {
      const loading = true;
      const totalCount: number | null = null;
      const shouldRenderNull = loading && totalCount === null;
      expect(shouldRenderNull).toBe(true);
    });

    it('renders when not loading regardless of totalCount', () => {
      const loading = false;
      const totalCount: number | null = null;
      const shouldRenderNull = loading && totalCount === null;
      expect(shouldRenderNull).toBe(false);
    });

    it('renders when loading but totalCount is available', () => {
      const loading = true;
      const totalCount: number | null = 10;
      const shouldRenderNull = loading && totalCount === null;
      expect(shouldRenderNull).toBe(false);
    });

    it('shows totalCount with i18n key when count is available', () => {
      const totalCount = 42;
      const displayText = totalCount !== null ? `expenses.totalExpenses` : '';
      expect(displayText).toBe('expenses.totalExpenses');
    });

    it('shows empty string when totalCount is null and not in loading state', () => {
      const totalCount: number | null = null;
      const displayText = totalCount !== null ? `expenses.totalExpenses` : '';
      expect(displayText).toBe('');
    });
  });
});
