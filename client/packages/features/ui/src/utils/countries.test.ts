import { COUNTRY_CODES, COUNTRY_NAMES } from './countries';

describe('countries constants', () => {
  describe('COUNTRY_CODES', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(COUNTRY_CODES)).toBe(true);
      expect(COUNTRY_CODES.length).toBeGreaterThan(0);
    });

    it('starts with CO (priority country)', () => {
      expect(COUNTRY_CODES[0]).toBe('CO');
    });

    it('contains expected priority countries', () => {
      const expected = ['CO', 'US', 'MX', 'ES', 'AR', 'PE', 'CL', 'BR'];
      for (const code of expected) {
        expect(COUNTRY_CODES).toContain(code);
      }
    });

    it('contains only uppercase 2-letter ISO codes', () => {
      for (const code of COUNTRY_CODES) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });

    it('has no duplicate codes', () => {
      const unique = new Set(COUNTRY_CODES);
      expect(unique.size).toBe(COUNTRY_CODES.length);
    });
  });

  describe('COUNTRY_NAMES', () => {
    it('is a non-empty object', () => {
      expect(typeof COUNTRY_NAMES).toBe('object');
      expect(Object.keys(COUNTRY_NAMES).length).toBeGreaterThan(0);
    });

    it('has string values for all entries', () => {
      for (const name of Object.values(COUNTRY_NAMES)) {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      }
    });

    it('has uppercase 2-letter ISO keys', () => {
      for (const key of Object.keys(COUNTRY_NAMES)) {
        expect(key).toMatch(/^[A-Z]{2,3}$/);
      }
    });

    it('contains expected country mappings', () => {
      expect(COUNTRY_NAMES['CO']).toBe('Colombia');
      expect(COUNTRY_NAMES['US']).toBe('United States');
      expect(COUNTRY_NAMES['MX']).toBe('Mexico');
      expect(COUNTRY_NAMES['ES']).toBe('Spain');
      expect(COUNTRY_NAMES['BR']).toBe('Brazil');
      expect(COUNTRY_NAMES['GB']).toBe('United Kingdom');
      expect(COUNTRY_NAMES['DE']).toBe('Germany');
      expect(COUNTRY_NAMES['FR']).toBe('France');
    });

    it('covers all COUNTRY_CODES entries', () => {
      for (const code of COUNTRY_CODES) {
        expect(COUNTRY_NAMES).toHaveProperty(code);
      }
    });
  });
});
