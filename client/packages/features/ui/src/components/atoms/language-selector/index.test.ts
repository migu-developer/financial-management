describe('LanguageSelector atom', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.LanguageSelector).toBe('function');
  });

  it('LanguageSelector has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LanguageSelector } = require('./index');
    expect(LanguageSelector.name).toBe('LanguageSelector');
  });

  describe('supported languages', () => {
    it('derives languages list from i18n resources (contains en and es)', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { resources } = require('@packages/i18n');
      const langs = Object.keys(resources);
      expect(langs).toContain('en');
      expect(langs).toContain('es');
    });

    it('has at least 2 supported languages', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { resources } = require('@packages/i18n');
      expect(Object.keys(resources).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('i18n translations', () => {
    it('languageSelector.label exists in en ui namespace', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ui } = require('@packages/i18n/locales/en/ui');
      expect(typeof ui.languageSelector.label).toBe('string');
      expect(ui.languageSelector.label.length).toBeGreaterThan(0);
    });

    it('languageSelector.label exists in es ui namespace', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ui } = require('@packages/i18n/locales/es/ui');
      expect(typeof ui.languageSelector.label).toBe('string');
      expect(ui.languageSelector.label.length).toBeGreaterThan(0);
    });

    it('en and es labels are distinct', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ui: enUi } = require('@packages/i18n/locales/en/ui');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ui: esUi } = require('@packages/i18n/locales/es/ui');
      expect(enUi.languageSelector.label).not.toBe(esUi.languageSelector.label);
    });
  });
});
