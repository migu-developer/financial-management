import mod from '@/app/index';
import { ROUTES } from '@/utils/route';

describe('Index screen (app/index)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('Index has the expected name', () => {
    expect(mod.name).toBe('Index');
  });

  describe('route configuration', () => {
    it('ROUTES.landing is "/landing"', () => {
      expect(ROUTES.landing).toBe('/landing');
    });

    it('ROUTES.index is "/"', () => {
      expect(ROUTES.index).toBe('/');
    });

    it('ROUTES.auth is defined', () => {
      expect(typeof ROUTES.auth).toBe('string');
    });
  });
});
