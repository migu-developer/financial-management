import LoginScreen from '@/app/auth/login';

describe('app/auth/login/index', () => {
  it('module exports a default function', () => {
    expect(typeof LoginScreen).toBe('function');
  });

  it('LoginScreen has the expected name', () => {
    expect(LoginScreen.name).toBe('LoginScreen');
  });
});
