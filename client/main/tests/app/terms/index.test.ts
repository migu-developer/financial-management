import mod from '@/app/terms';
import { TermsPage, TermsTemplate } from '@features/landing';
import { ROUTES } from '@/utils/route';

describe('TermsScreen screen (app/terms)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('TermsScreen has the expected name', () => {
    expect(mod.name).toBe('TermsScreen');
  });

  describe('terms feature integration', () => {
    it('TermsPage is exported from @features/landing', () => {
      expect(typeof TermsPage).toBe('function');
    });

    it('TermsTemplate is exported from @features/landing', () => {
      expect(typeof TermsTemplate).toBe('function');
    });
  });

  describe('navigation', () => {
    it('ROUTES.terms is "/terms"', () => {
      expect(ROUTES.terms).toBe('/terms');
    });
  });
});
