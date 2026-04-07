import { ExpenseCardSkeleton } from '.';

describe('ExpenseCardSkeleton', () => {
  it('exports a function component', () => {
    expect(typeof ExpenseCardSkeleton).toBe('function');
  });

  it('has the expected name', () => {
    expect(ExpenseCardSkeleton.name).toBe('ExpenseCardSkeleton');
  });
});
