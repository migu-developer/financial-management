import mod from '@/app/auth/_layout';
import { useAuth } from '@features/auth';
import { ROUTES } from '@/utils/route';

describe('AuthLayout screen (app/auth/_layout)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('AuthLayout has the expected name', () => {
    expect(mod.name).toBe('AuthLayout');
  });

  describe('auth provider', () => {
    it('useAuth is exported from @features/auth', () => {
      expect(typeof useAuth).toBe('function');
    });
  });

  describe('route guard configuration', () => {
    it('ROUTES.dashboard.home is defined for authenticated redirect', () => {
      expect(ROUTES.dashboard.home).toBeDefined();
    });

    it('ROUTES.dashboard.home points to the dashboard home path', () => {
      expect(ROUTES.dashboard.home).toBe('/dashboard/home');
    });
  });
});
