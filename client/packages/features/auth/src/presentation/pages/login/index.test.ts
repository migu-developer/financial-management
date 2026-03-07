import { LoginPage } from './index';

describe('LoginPage', () => {
  it('exports a function', () => {
    expect(typeof LoginPage).toBe('function');
  });

  it('has the expected name', () => {
    expect(LoginPage.name).toBe('LoginPage');
  });
});
