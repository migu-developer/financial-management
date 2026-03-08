import mod from '@/app/landing';
import { LandingPage, LandingTemplate } from '@features/landing';
import { ROUTES } from '@/utils/route';

describe('LandingScreen screen (app/landing)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('LandingScreen has the expected name', () => {
    expect(mod.name).toBe('LandingScreen');
  });

  describe('landing feature integration', () => {
    it('LandingPage is exported from @features/landing', () => {
      expect(typeof LandingPage).toBe('function');
    });

    it('LandingTemplate is exported from @features/landing', () => {
      expect(typeof LandingTemplate).toBe('function');
    });
  });

  describe('navigation', () => {
    it('ROUTES.auth is defined for post-landing navigation', () => {
      expect(typeof ROUTES.auth).toBe('string');
    });

    it('ROUTES.privacy is defined for footer link navigation', () => {
      expect(ROUTES.privacy).toBe('/privacy');
    });

    it('ROUTES.terms is defined for footer link navigation', () => {
      expect(ROUTES.terms).toBe('/terms');
    });

    it('ROUTES.contact is defined for footer link navigation', () => {
      expect(ROUTES.contact).toBe('/contact');
    });
  });
});
