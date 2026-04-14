import { SearchInput } from '.';

describe('SearchInput', () => {
  it('exports a function component', () => {
    expect(typeof SearchInput).toBe('function');
  });

  it('has the expected name', () => {
    expect(SearchInput.name).toBe('SearchInput');
  });
});
