import mod from '@/app/dashboard/_layout';
import { requireEnv } from '@packages/models/shared/utils/require-env';
import { useAuth } from '@features/auth';
import { ROUTES } from '@/utils/route';

describe('DashboardLayout screen (app/dashboard/_layout)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = 'https://example.com';
    process.env.EXPO_PUBLIC_APPSYNC_REALTIME_DNS = 'https://example.com';
    process.env.EXPO_PUBLIC_APPSYNC_CHAT_NAMESPACE = 'chat';
  });

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

  describe('requireEnv (shared from @packages/models)', () => {
    it('throws naming the variable when not configured', () => {
      expect(() => requireEnv(undefined, 'EXPO_PUBLIC_API_URL')).toThrow(
        'Environment variable EXPO_PUBLIC_API_URL is not configured.',
      );
    });
  });

  describe('API_BASE_URL', () => {
    it('is defined if the environment variable is configured', () => {
      expect(
        requireEnv(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL'),
      ).toBe('https://example.com');
    });
  });
});
