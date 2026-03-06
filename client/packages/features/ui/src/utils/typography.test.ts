import { fontFamily, fontSize, fontSizeV3, fontWeight } from './typography';

describe('typography — design system tokens', () => {
  describe('fontSizeV3 (rem-based, Tailwind v3 / NativeWind)', () => {
    const expectedSizes = [
      'xs',
      'sm',
      'base',
      'lg',
      'xl',
      '2xl',
      '3xl',
      '4xl',
    ] as const;

    it('exports all 8 size steps', () => {
      expectedSizes.forEach((size) => {
        expect(fontSizeV3[size]).toBeDefined();
      });
    });

    it('each entry is a [remSize, { lineHeight }] tuple', () => {
      expectedSizes.forEach((size) => {
        const entry = fontSizeV3[size];
        expect(Array.isArray(entry)).toBe(true);
        expect(entry).toHaveLength(2);
        expect(entry?.[0]).toMatch(/^\d+(\.\d+)?rem$/);
        expect(typeof entry?.[1]).toBe('object');
        expect(entry?.[1]?.lineHeight).toMatch(/^\d+(\.\d+)?rem$/);
      });
    });

    it('uses rem (not px) for font sizes', () => {
      expectedSizes.forEach((size) => {
        expect(fontSizeV3[size]?.[0]).toMatch(/rem$/);
        expect(fontSizeV3[size]?.[0]).not.toMatch(/px$/);
      });
    });

    it('uses rem (not ratio) for lineHeight', () => {
      expectedSizes.forEach((size) => {
        expect(fontSizeV3[size]?.[1]?.lineHeight).toMatch(/rem$/);
      });
    });

    it('base font size is 1rem', () => {
      expect(fontSizeV3['base']?.[0]).toBe('1rem');
    });

    it('has same number of steps as fontSize (v4 px version)', () => {
      const v4Keys = Object.keys(fontSize);
      const v3Keys = Object.keys(fontSizeV3);
      expect(v3Keys).toHaveLength(v4Keys.length);
      v4Keys.forEach((key) => expect(v3Keys).toContain(key));
    });
  });

  describe('fontFamily', () => {
    it('exports sans and display', () => {
      expect(fontFamily.sans).toBeDefined();
      expect(fontFamily.display).toBeDefined();
    });

    it('both are arrays of strings', () => {
      expect(Array.isArray(fontFamily.sans)).toBe(true);
      expect(Array.isArray(fontFamily.display)).toBe(true);
      fontFamily.sans.forEach((f) => expect(typeof f).toBe('string'));
      fontFamily.display.forEach((f) => expect(typeof f).toBe('string'));
    });

    it('includes system font stack', () => {
      expect(fontFamily.sans).toContain('-apple-system');
      expect(fontFamily.sans).toContain('BlinkMacSystemFont');
      expect(fontFamily.sans).toContain('sans-serif');
    });
  });

  describe('fontSize', () => {
    const expectedSizes = [
      'xs',
      'sm',
      'base',
      'lg',
      'xl',
      '2xl',
      '3xl',
      '4xl',
    ] as const;

    it('exports all size steps', () => {
      expectedSizes.forEach((size) => {
        expect(fontSize[size]).toBeDefined();
      });
    });

    it('each size is a tuple of [value, { lineHeight }]', () => {
      expectedSizes.forEach((size) => {
        const entry = fontSize[size];
        expect(Array.isArray(entry)).toBe(true);
        expect(typeof entry[0]).toBe('string');
        expect(entry[0]).toMatch(/^\d+px$/);
        expect(typeof entry[1]).toBe('object');
        expect((entry[1] as { lineHeight: string }).lineHeight).toBeDefined();
      });
    });

    it('base font size is 16px', () => {
      expect(fontSize.base[0]).toBe('16px');
    });
  });

  describe('fontWeight', () => {
    it('exports normal, medium, semibold, bold', () => {
      expect(fontWeight.normal).toBe('400');
      expect(fontWeight.medium).toBe('500');
      expect(fontWeight.semibold).toBe('600');
      expect(fontWeight.bold).toBe('700');
    });

    it('all values are numeric strings', () => {
      Object.values(fontWeight).forEach((v) => {
        expect(typeof v).toBe('string');
        expect(Number.isNaN(Number(v))).toBe(false);
      });
    });
  });
});
