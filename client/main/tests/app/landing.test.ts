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
  });
});
