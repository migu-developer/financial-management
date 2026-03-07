import mod from '@/app/privacy';
import { PrivacyPage, PrivacyTemplate } from '@features/landing';
import { ROUTES } from '@/utils/route';

describe('PrivacyScreen screen (app/privacy)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('PrivacyScreen has the expected name', () => {
    expect(mod.name).toBe('PrivacyScreen');
  });

  describe('privacy feature integration', () => {
    it('PrivacyPage is exported from @features/landing', () => {
      expect(typeof PrivacyPage).toBe('function');
    });

    it('PrivacyTemplate is exported from @features/landing', () => {
      expect(typeof PrivacyTemplate).toBe('function');
    });
  });

  describe('navigation', () => {
    it('ROUTES.privacy is "/privacy"', () => {
      expect(ROUTES.privacy).toBe('/privacy');
    });
  });
});
