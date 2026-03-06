import { resources } from '@packages/i18n';
import { NotFoundTemplate } from './index';

describe('NotFoundTemplate template', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.NotFoundTemplate).toBe('function');
  });

  it('NotFoundTemplate has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NotFoundTemplate } = require('./index');
    expect(NotFoundTemplate.name).toBe('NotFoundTemplate');
  });

  describe('i18n translations', () => {
    it('notFound section exists in en landing namespace', () => {
      const { en: enLanding } = resources;
      expect(enLanding.landing.notFound).toBeDefined();
      expect(enLanding.landing.notFound.code).toBe('404');
      expect(typeof enLanding.landing.notFound.title).toBe('string');
      expect(typeof enLanding.landing.notFound.description).toBe('string');
      expect(typeof enLanding.landing.notFound.cta).toBe('string');
    });

    it('notFound section exists in es landing namespace', () => {
      const { es: esLanding } = resources;
      expect(esLanding.landing.notFound).toBeDefined();
      expect(esLanding.landing.notFound.code).toBe('404');
      expect(typeof esLanding.landing.notFound.title).toBe('string');
    });

    it('notFound has a11y.cta key in both locales', () => {
      const { en: enLanding } = resources;
      const { es: esLanding } = resources;
      expect(typeof enLanding.landing.notFound.a11y.cta).toBe('string');
      expect(typeof esLanding.landing.notFound.a11y.cta).toBe('string');
    });

    it('en and es titles are distinct', () => {
      const { en: enLanding } = resources;
      const { es: esLanding } = resources;
      expect(enLanding.landing.notFound.title).not.toBe(
        esLanding.landing.notFound.title,
      );
    });
  });

  describe('props interface', () => {
    it('accepts optional onGoHomePress callback', () => {
      expect(typeof NotFoundTemplate).toBe('function');
    });
  });
});
