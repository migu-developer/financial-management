import ForgotPasswordConfirmScreen from '@/app/auth/forgot-password/confirm';
import { ROUTES } from '@/utils/route';

describe('app/auth/forgot-password/confirm/index', () => {
  it('module exports a default function', () => {
    expect(typeof ForgotPasswordConfirmScreen).toBe('function');
  });

  it('ForgotPasswordConfirmScreen has the expected name', () => {
    expect(ForgotPasswordConfirmScreen.name).toBe(
      'ForgotPasswordConfirmScreen',
    );
  });

  describe('route configuration', () => {
    it('ROUTES.authForgotPasswordConfirm is defined', () => {
      expect(ROUTES.authForgotPasswordConfirm).toBeDefined();
    });

    it('ROUTES.authForgotPasswordConfirm points to the confirm path', () => {
      expect(ROUTES.authForgotPasswordConfirm).toBe(
        '/auth/forgot-password/confirm',
      );
    });
  });
});
