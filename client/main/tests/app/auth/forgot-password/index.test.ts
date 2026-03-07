import ForgotPasswordScreen from '@/app/auth/forgot-password';

describe('app/auth/forgot-password/index', () => {
  it('module exports a default function', () => {
    expect(typeof ForgotPasswordScreen).toBe('function');
  });

  it('ForgotPasswordScreen has the expected name', () => {
    expect(ForgotPasswordScreen.name).toBe('ForgotPasswordScreen');
  });
});
