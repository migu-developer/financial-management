import { ForgotPasswordPage } from './index';

describe('ForgotPasswordPage', () => {
  it('exports a function', () => {
    expect(typeof ForgotPasswordPage).toBe('function');
  });

  it('has the expected name', () => {
    expect(ForgotPasswordPage.name).toBe('ForgotPasswordPage');
  });
});
