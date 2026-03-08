import RegisterScreen from '@/app/auth/register';

describe('app/auth/register/index', () => {
  it('module exports a default function', () => {
    expect(typeof RegisterScreen).toBe('function');
  });

  it('RegisterScreen has the expected name', () => {
    expect(RegisterScreen.name).toBe('RegisterScreen');
  });
});
