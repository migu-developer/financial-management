import { AuthProvider, useAuth } from './auth-provider';

describe('AuthProvider', () => {
  it('exports AuthProvider as a function', () => {
    expect(typeof AuthProvider).toBe('function');
  });

  it('has the expected name', () => {
    expect(AuthProvider.name).toBe('AuthProvider');
  });

  it('exports useAuth as a function', () => {
    expect(typeof useAuth).toBe('function');
  });
});
