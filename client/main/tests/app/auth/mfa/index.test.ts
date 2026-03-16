import MfaScreen from '@/app/auth/mfa';
import { ROUTES } from '@/utils/route';

describe('app/auth/mfa/index', () => {
  it('module exports a default function', () => {
    expect(typeof MfaScreen).toBe('function');
  });

  it('MfaScreen has the expected name', () => {
    expect(MfaScreen.name).toBe('MfaScreen');
  });

  describe('route configuration', () => {
    it('ROUTES.authMfa is defined', () => {
      expect(ROUTES.authMfa).toBeDefined();
    });

    it('ROUTES.authMfa points to the mfa path', () => {
      expect(ROUTES.authMfa).toBe('/auth/mfa');
    });
  });
});
