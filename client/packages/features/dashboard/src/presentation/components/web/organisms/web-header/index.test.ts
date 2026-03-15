import { WebHeader } from './index';

describe('WebHeader', () => {
  it('exports a function', () => {
    expect(typeof WebHeader).toBe('function');
  });

  it('has the expected name', () => {
    expect(WebHeader.name).toBe('WebHeader');
  });
});
