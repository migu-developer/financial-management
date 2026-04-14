import { parseExpenseFilters } from './filters';

describe('parseExpenseFilters', () => {
  it('returns empty object when qs is null', () => {
    expect(parseExpenseFilters(null)).toEqual({});
  });

  it('returns empty object when qs is undefined', () => {
    expect(parseExpenseFilters(undefined)).toEqual({});
  });

  it('returns empty object when qs has no filter keys', () => {
    expect(parseExpenseFilters({ limit: '20', cursor: 'abc' })).toEqual({});
  });

  it('parses expense_type_id', () => {
    const result = parseExpenseFilters({ expense_type_id: 'type-1' });
    expect(result).toEqual({ expense_type_id: 'type-1' });
  });

  it('parses expense_category_id', () => {
    const result = parseExpenseFilters({ expense_category_id: 'cat-1' });
    expect(result).toEqual({ expense_category_id: 'cat-1' });
  });

  it('parses name', () => {
    const result = parseExpenseFilters({ name: 'groceries' });
    expect(result).toEqual({ name: 'groceries' });
  });

  it('parses all filters together', () => {
    const result = parseExpenseFilters({
      expense_type_id: 'type-1',
      expense_category_id: 'cat-1',
      name: 'groceries',
    });
    expect(result).toEqual({
      expense_type_id: 'type-1',
      expense_category_id: 'cat-1',
      name: 'groceries',
    });
  });

  it('ignores empty string values', () => {
    const result = parseExpenseFilters({
      expense_type_id: '',
      name: '',
    });
    expect(result).toEqual({});
  });

  it('ignores undefined values in qs', () => {
    const result = parseExpenseFilters({
      expense_type_id: undefined,
      name: 'test',
    });
    expect(result).toEqual({ name: 'test' });
  });
});
