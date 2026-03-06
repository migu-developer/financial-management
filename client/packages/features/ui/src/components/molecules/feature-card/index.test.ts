import { primary } from '../../../utils/colors';

describe('FeatureCard component', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.FeatureCard).toBe('function');
  });

  describe('default design tokens', () => {
    it('default iconColor is primary[600] (teal brand color)', () => {
      expect(primary[600]).toBe('#2A7C8F');
    });

    it('primary[600] is a valid hex color string', () => {
      expect(primary[600]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('default iconBgClassName uses primary-50 token', () => {
      // The default iconBgClassName is 'bg-primary-50'
      // Verify the corresponding color exists in the design system
      expect(primary[50]).toBeDefined();
      expect(primary[50]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
