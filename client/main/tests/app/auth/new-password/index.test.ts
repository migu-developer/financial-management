import NewPasswordScreen from '@/app/auth/new-password';
import { ROUTES } from '@/utils/route';

describe('app/auth/new-password/index', () => {
  it('module exports a default function', () => {
    expect(typeof NewPasswordScreen).toBe('function');
  });

  it('NewPasswordScreen has the expected name', () => {
    expect(NewPasswordScreen.name).toBe('NewPasswordScreen');
  });

  describe('route configuration', () => {
    it('ROUTES.authNewPassword is defined', () => {
      expect(ROUTES.authNewPassword).toBeDefined();
    });

    it('ROUTES.authNewPassword points to the new-password path', () => {
      expect(ROUTES.authNewPassword).toBe('/auth/new-password');
    });
  });
});
