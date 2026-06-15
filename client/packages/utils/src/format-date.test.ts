jest.mock('react-native', () => ({
  Platform: { OS: 'web' as string },
}));

import {
  formatDate,
  formatDateOnly,
  getUserLocale,
  getSupportedLocales,
} from './format-date';

const ISO = '2026-03-31T12:00:00Z';

describe('formatDate', () => {
  describe('medium style', () => {
    it('formats for en-US', () => {
      const result = formatDate(ISO, 'en-US', 'medium');
      expect(result).toContain('Mar');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });

    it('formats for es-CO', () => {
      const result = formatDate(ISO, 'es-CO', 'medium');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });

    it('formats for es-MX', () => {
      const result = formatDate(ISO, 'es-MX', 'medium');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });

    it('formats for es-AR', () => {
      const result = formatDate(ISO, 'es-AR', 'medium');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });

    it('formats for es-UY', () => {
      const result = formatDate(ISO, 'es-UY', 'medium');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });

    it('formats for fi-FI', () => {
      const result = formatDate(ISO, 'fi-FI', 'medium');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });

    it('formats for en-AU', () => {
      const result = formatDate(ISO, 'en-AU', 'medium');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });
  });

  describe('short style', () => {
    it('does not include year', () => {
      const result = formatDate(ISO, 'en-US', 'short');
      expect(result).toContain('Mar');
      expect(result).toContain('31');
      expect(result).not.toContain('2026');
    });
  });

  describe('long style', () => {
    it('includes full month name', () => {
      const result = formatDate(ISO, 'en-US', 'long');
      expect(result).toContain('March');
      expect(result).toContain('31');
      expect(result).toContain('2026');
    });
  });

  describe('edge cases', () => {
    it('handles unknown locale gracefully', () => {
      const result = formatDate(ISO, 'xx-XX', 'medium');
      expect(result).toBeTruthy();
    });
  });
});

describe('formatDateOnly', () => {
  it('preserves the calendar day regardless of timezone (no UTC shift)', () => {
    // "2026-03-31" as instant-UTC would render "Mar 30" in negative offsets;
    // formatDateOnly must keep the 31st.
    const result = formatDateOnly('2026-03-31', 'en-US', 'medium');
    expect(result).toContain('Mar');
    expect(result).toContain('31');
    expect(result).toContain('2026');
  });

  it('ignores a trailing time component', () => {
    const result = formatDateOnly('2026-03-31T00:00:00Z', 'en-US', 'medium');
    expect(result).toContain('31');
    expect(result).toContain('2026');
  });

  it('falls back gracefully for an unexpected shape', () => {
    const result = formatDateOnly('not-a-date', 'en-US', 'medium');
    expect(result).toBeTruthy();
  });

  it('does not silently roll over an out-of-range date', () => {
    // Month 13 / day 40 must NOT render as a rolled-over Jan/Feb date.
    const result = formatDateOnly('2026-13-40', 'en-US', 'medium');
    expect(result).not.toContain('Jan');
    expect(result).not.toContain('Feb');
  });
});

describe('getUserLocale', () => {
  it('returns navigator.language on web', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'es-CO', languages: ['es-CO', 'en-US'] },
      writable: true,
      configurable: true,
    });
    const locale = getUserLocale();
    expect(locale).toBe('es-CO');
  });

  it('returns first entry of navigator.languages', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-US', languages: ['fi-FI', 'en-US'] },
      writable: true,
      configurable: true,
    });
    const locale = getUserLocale();
    expect(locale).toBe('fi-FI');
  });

  it('falls back to en-US when navigator is undefined', () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const locale = getUserLocale();
    expect(locale).toBe('en-US');
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

describe('getSupportedLocales', () => {
  it('returns an array of locale strings', () => {
    const locales = getSupportedLocales();
    expect(Array.isArray(locales)).toBe(true);
    expect(locales.length).toBeGreaterThan(0);
  });

  it('includes es-CO, en-US, en-AU, fi-FI', () => {
    const locales = getSupportedLocales();
    expect(locales).toContain('es-CO');
    expect(locales).toContain('en-US');
    expect(locales).toContain('en-AU');
    expect(locales).toContain('fi-FI');
  });
});
