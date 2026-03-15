import { UserMenu } from './index';

describe('UserMenu', () => {
  it('exports a function', () => {
    expect(typeof UserMenu).toBe('function');
  });

  it('has the expected name', () => {
    expect(UserMenu.name).toBe('UserMenu');
  });
});
