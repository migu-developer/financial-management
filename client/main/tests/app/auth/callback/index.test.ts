import AuthCallbackScreen from '@/app/auth/callback';
import { ROUTES } from '@/utils/route';

describe('app/auth/callback/index', () => {
  it('module exports a default function', () => {
    expect(typeof AuthCallbackScreen).toBe('function');
  });

  it('AuthCallbackScreen has the expected name', () => {
    expect(AuthCallbackScreen.name).toBe('AuthCallbackScreen');
  });

  describe('route configuration', () => {
    it('ROUTES.authCallback is defined', () => {
      expect(ROUTES.authCallback).toBeDefined();
    });

    it('ROUTES.authCallback points to the callback path', () => {
      expect(ROUTES.authCallback).toBe('/auth/callback');
    });
  });
});
