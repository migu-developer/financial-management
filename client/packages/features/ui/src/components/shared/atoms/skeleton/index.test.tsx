import { Skeleton } from '.';

describe('Skeleton', () => {
  it('exports a function component', () => {
    expect(typeof Skeleton).toBe('function');
  });

  it('has the expected name', () => {
    expect(Skeleton.name).toBe('Skeleton');
  });
});
