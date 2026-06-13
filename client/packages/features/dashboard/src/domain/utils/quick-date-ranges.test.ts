import {
  getQuickRange,
  matchQuickRange,
  QUICK_RANGE_OPTIONS,
} from './quick-date-ranges';

// Fixed reference date: June 10, 2026 (months are 0-based).
const TODAY = new Date(2026, 5, 10);

describe('getQuickRange', () => {
  it('currentMonth spans the 1st of this month to today', () => {
    expect(getQuickRange('currentMonth', TODAY)).toEqual({
      from: '2026-06-01',
      to: '2026-06-10',
    });
  });

  it('pastMonth spans the full previous month', () => {
    expect(getQuickRange('pastMonth', TODAY)).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('lastThreeMonths spans three calendar months including the current one', () => {
    expect(getQuickRange('lastThreeMonths', TODAY)).toEqual({
      from: '2026-04-01',
      to: '2026-06-10',
    });
  });

  it('handles year boundaries (January → past month is December)', () => {
    const january = new Date(2026, 0, 15);
    expect(getQuickRange('pastMonth', january)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
    expect(getQuickRange('lastThreeMonths', january)).toEqual({
      from: '2025-11-01',
      to: '2026-01-15',
    });
  });

  it('pastMonth ends on the 29th in a leap-year February', () => {
    const march2028 = new Date(2028, 2, 5);
    expect(getQuickRange('pastMonth', march2028).to).toBe('2028-02-29');
  });
});

describe('matchQuickRange', () => {
  it.each(QUICK_RANGE_OPTIONS)('round-trips %s', (option) => {
    const { from, to } = getQuickRange(option, TODAY);
    expect(matchQuickRange(from, to, TODAY)).toBe(option);
  });

  it('returns null for manual ranges', () => {
    expect(matchQuickRange('2026-01-01', '2026-06-10', TODAY)).toBeNull();
  });

  it('returns null when from/to are missing', () => {
    expect(matchQuickRange(undefined, '2026-06-10', TODAY)).toBeNull();
    expect(matchQuickRange('2026-06-01', undefined, TODAY)).toBeNull();
  });
});
