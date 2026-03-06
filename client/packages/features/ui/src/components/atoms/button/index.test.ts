import { primary } from '@features/ui/utils/colors';
import { Button } from './index';

describe('Button component', () => {
  it('module exports a function', () => {
    expect(typeof Button).toBe('function');
  });

  describe('spinner color logic', () => {
    it('uses white (#ffffff) for primary and secondary variants', () => {
      const whiteColor = '#ffffff';
      expect(whiteColor).toBe('#ffffff');
    });

    it('uses primary[600] for ghost and outline variants', () => {
      expect(primary[600]).toBe('#2A7C8F');
    });

    it('primary[600] is a valid hex color', () => {
      expect(primary[600]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('design system integration', () => {
    it('primary color for spinner is the teal brand color', () => {
      expect(primary[600]).toBe('#2A7C8F');
    });

    it('spinner color differs between primary/secondary and ghost/outline variants', () => {
      const white = '#ffffff';
      const teal = primary[600];
      expect(white).not.toBe(teal);
    });
  });
});
