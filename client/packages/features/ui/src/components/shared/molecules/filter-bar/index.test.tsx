import { FilterBar } from '.';

describe('FilterBar', () => {
  it('exports a function component', () => {
    expect(typeof FilterBar).toBe('function');
  });

  it('has the expected name', () => {
    expect(FilterBar.name).toBe('FilterBar');
  });
});
