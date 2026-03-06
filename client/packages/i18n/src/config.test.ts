import i18n, { resources } from './config';

describe('i18n configuration', () => {
  it('is initialized synchronously', () => {
    expect(i18n.isInitialized).toBe(true);
  });

  it('uses English as default language', () => {
    expect(i18n.language).toBe('en');
  });

  it('uses English as fallback language', () => {
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('supports English and Spanish', () => {
    const languages = Object.keys(resources);
    expect(languages).toContain('en');
    expect(languages).toContain('es');
    expect(languages).toHaveLength(2);
  });

  it('exposes the login namespace for each language', () => {
    expect(resources.en).toHaveProperty('login');
    expect(resources.es).toHaveProperty('login');
  });
});
