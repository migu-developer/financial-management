import { Avatar } from './index';

describe('Avatar', () => {
  it('exports a function', () => {
    expect(typeof Avatar).toBe('function');
  });

  it('has the expected name', () => {
    expect(Avatar.name).toBe('Avatar');
  });
});
