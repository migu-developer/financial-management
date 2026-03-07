import mod from '@/app/contact';
import { ContactPage, ContactTemplate } from '@features/landing';
import { ROUTES } from '@/utils/route';

describe('ContactScreen screen (app/contact)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('ContactScreen has the expected name', () => {
    expect(mod.name).toBe('ContactScreen');
  });

  describe('contact feature integration', () => {
    it('ContactPage is exported from @features/landing', () => {
      expect(typeof ContactPage).toBe('function');
    });

    it('ContactTemplate is exported from @features/landing', () => {
      expect(typeof ContactTemplate).toBe('function');
    });
  });

  describe('navigation', () => {
    it('ROUTES.contact is "/contact"', () => {
      expect(ROUTES.contact).toBe('/contact');
    });
  });
});
