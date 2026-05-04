import { CategoryBreakdown } from '.';

describe('CategoryBreakdown', () => {
  it('exports a function component', () => {
    expect(typeof CategoryBreakdown).toBe('function');
  });

  it('has the expected name', () => {
    expect(CategoryBreakdown.name).toBe('CategoryBreakdown');
  });
});
