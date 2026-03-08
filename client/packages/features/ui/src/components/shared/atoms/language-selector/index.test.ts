import { LanguageSelector } from './index';
import { resources, SupportedLanguage } from '@packages/i18n';

describe('LanguageSelector atom', () => {
  it('module exports a function', () => {
    expect(typeof LanguageSelector).toBe('function');
  });

  it('LanguageSelector has the expected name', () => {
    expect(LanguageSelector.name).toBe('LanguageSelector');
  });

  describe('supported languages', () => {
    it('derives languages list from i18n resources', () => {
      const langs = Object.keys(resources);
      expect(langs).toContain('en');
      expect(langs).toContain('es');
    });

    it('has at least 2 supported languages', () => {
      expect(Object.keys(resources).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('i18n translations — languageSelector.label', () => {
    it('label exists in en ui namespace', () => {
      const { ui } = resources.en;
      expect(typeof ui.languageSelector.label).toBe('string');
      expect(ui.languageSelector.label.length).toBeGreaterThan(0);
    });

    it('label exists in es ui namespace', () => {
      const { ui } = resources.es;
      expect(typeof ui.languageSelector.label).toBe('string');
      expect(ui.languageSelector.label.length).toBeGreaterThan(0);
    });

    it('en and es labels are distinct', () => {
      const { ui: enUi } = resources.en;
      const { ui: esUi } = resources.es;
      expect(enUi.languageSelector.label).not.toBe(esUi.languageSelector.label);
    });
  });

  describe('i18n translations — languageSelector.languages (menu options)', () => {
    it('en ui has language names for all supported locales', () => {
      const { ui } = resources.en;
      const langs = Object.keys(resources);
      langs.forEach((lang) => {
        expect(
          typeof ui.languageSelector.languages[lang as SupportedLanguage],
        ).toBe('string');
        expect(
          ui.languageSelector.languages[lang as SupportedLanguage].length,
        ).toBeGreaterThan(0);
      });
    });

    it('en label for "en" is English', () => {
      const { ui } = resources.en;
      expect(ui.languageSelector.languages.en).toBe('English');
    });

    it('es label for "es" is Español', () => {
      const { ui } = resources.es;
      expect(ui.languageSelector.languages.es).toBe('Español');
    });
  });
});
