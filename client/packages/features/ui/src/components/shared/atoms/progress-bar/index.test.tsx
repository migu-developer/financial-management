import { ProgressBar } from '.';

describe('ProgressBar', () => {
  it('exports a function component', () => {
    expect(typeof ProgressBar).toBe('function');
  });

  it('has the expected name', () => {
    expect(ProgressBar.name).toBe('ProgressBar');
  });
});
