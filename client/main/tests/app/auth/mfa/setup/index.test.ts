import MfaSetupScreen from '@/app/auth/mfa/setup';
import { ROUTES } from '@/utils/route';

describe('app/auth/mfa/setup/index', () => {
  it('module exports a default function', () => {
    expect(typeof MfaSetupScreen).toBe('function');
  });

  it('MfaSetupScreen has the expected name', () => {
    expect(MfaSetupScreen.name).toBe('MfaSetupScreen');
  });

  describe('route configuration', () => {
    it('ROUTES.authMfaSetup is defined', () => {
      expect(ROUTES.authMfaSetup).toBeDefined();
    });

    it('ROUTES.authMfaSetup points to the mfa setup path', () => {
      expect(ROUTES.authMfaSetup).toBe('/auth/mfa/setup');
    });
  });
});
