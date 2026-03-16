import RegisterConfirmScreen from '@/app/auth/register/confirm';
import { ROUTES } from '@/utils/route';

describe('app/auth/register/confirm/index', () => {
  it('module exports a default function', () => {
    expect(typeof RegisterConfirmScreen).toBe('function');
  });

  it('RegisterConfirmScreen has the expected name', () => {
    expect(RegisterConfirmScreen.name).toBe('RegisterConfirmScreen');
  });

  describe('route configuration', () => {
    it('ROUTES.authRegisterConfirm is defined', () => {
      expect(ROUTES.authRegisterConfirm).toBeDefined();
    });

    it('ROUTES.authRegisterConfirm points to the confirm path', () => {
      expect(ROUTES.authRegisterConfirm).toBe('/auth/register/confirm');
    });
  });
});
