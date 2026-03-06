import { spacing, borderRadius, boxShadow } from './spacing';

describe('spacing — design system tokens', () => {
  describe('spacing', () => {
    it('exports custom spacing steps', () => {
      expect(spacing['18']).toBe('4.5rem');
      expect(spacing['22']).toBe('5.5rem');
      expect(spacing['128']).toBe('32rem');
      expect(spacing['144']).toBe('36rem');
    });

    it('all values are rem strings', () => {
      Object.values(spacing).forEach((v) => {
        expect(v).toMatch(/^\d+(\.\d+)?rem$/);
      });
    });
  });

  describe('borderRadius', () => {
    it('exports 2xl and 4xl variants', () => {
      expect(borderRadius['2xl']).toBe('1rem');
      expect(borderRadius['4xl']).toBe('2rem');
    });

    it('all values are rem strings', () => {
      Object.values(borderRadius).forEach((v) => {
        expect(v).toMatch(/^\d+(\.\d+)?rem$/);
      });
    });
  });

  describe('boxShadow', () => {
    it('exports card and card-md', () => {
      expect(boxShadow.card).toBeDefined();
      expect(boxShadow['card-md']).toBeDefined();
    });

    it('card is a valid CSS box-shadow string', () => {
      expect(typeof boxShadow.card).toBe('string');
      expect(boxShadow.card.length).toBeGreaterThan(0);
    });

    it('card-md is more complex than card (more shadows)', () => {
      expect(boxShadow['card-md']).not.toBe(boxShadow.card);
    });
  });
});
