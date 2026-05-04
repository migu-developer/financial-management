import { StatCard } from '.';

describe('StatCard', () => {
  it('exports a function component', () => {
    expect(typeof StatCard).toBe('function');
  });

  it('has the expected name', () => {
    expect(StatCard.name).toBe('StatCard');
  });
});
