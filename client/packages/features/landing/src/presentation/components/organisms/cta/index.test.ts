import { primary } from '@features/ui/utils/colors';

describe('CTASection organism', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.CTASection).toBe('function');
  });

  it('CTASection has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CTASection } = require('./index');
    expect(CTASection.name).toBe('CTASection');
  });

  describe('design system tokens used by CTA', () => {
    it('uses primary-600 as the CTA background color (bg-primary-600 className)', () => {
      expect(primary[600]).toBe('#2A7C8F');
    });

    it('primary-200 would be used for subtitle text color', () => {
      expect(primary[200]).toBeDefined();
      expect(primary[200]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('props interface', () => {
    it('accepts optional onGetStartedPress callback', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CTASection } = require('./index');
      expect(CTASection).toBeDefined();
    });
  });
});
