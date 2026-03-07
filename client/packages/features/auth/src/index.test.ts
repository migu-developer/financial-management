import {
  ForgotPasswordPage,
  ForgotPasswordTemplate,
  LoginPage,
  LoginTemplate,
  RegisterPage,
  RegisterTemplate,
} from './index';

describe('@features/auth index exports', () => {
  it('exports LoginPage', () => {
    expect(typeof LoginPage).toBe('function');
  });

  it('exports LoginTemplate', () => {
    expect(typeof LoginTemplate).toBe('function');
  });

  it('exports RegisterPage', () => {
    expect(typeof RegisterPage).toBe('function');
  });

  it('exports RegisterTemplate', () => {
    expect(typeof RegisterTemplate).toBe('function');
  });

  it('exports ForgotPasswordPage', () => {
    expect(typeof ForgotPasswordPage).toBe('function');
  });

  it('exports ForgotPasswordTemplate', () => {
    expect(typeof ForgotPasswordTemplate).toBe('function');
  });
});
