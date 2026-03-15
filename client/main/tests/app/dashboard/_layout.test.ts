import mod from '@/app/dashboard/_layout';
import { useAuth } from '@features/auth';
import { ROUTES } from '@/utils/route';

describe('DashboardLayout screen (app/dashboard/_layout)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('DashboardLayout has the expected name', () => {
    expect(mod.name).toBe('DashboardLayout');
  });

  describe('auth provider', () => {
    it('useAuth is exported from @features/auth', () => {
      expect(typeof useAuth).toBe('function');
    });
  });

  describe('route guard configuration', () => {
    it('ROUTES.authLogin is defined for unauthenticated redirect', () => {
      expect(ROUTES.authLogin).toBeDefined();
    });

    it('ROUTES.authLogin points to the login path', () => {
      expect(ROUTES.authLogin).toBe('/auth/login');
    });
  });
});
