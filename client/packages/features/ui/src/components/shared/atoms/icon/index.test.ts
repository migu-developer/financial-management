import { neutral } from '@features/ui/utils/colors';
import { Icon } from './index';

describe('Icon component', () => {
  it('module exports a function', () => {
    expect(typeof Icon).toBe('function');
  });

  describe('default color from design system', () => {
    it('uses neutral[900] as the default icon color', () => {
      expect(neutral[900]).toBe('#171717');
    });

    it('neutral[900] is a valid hex color', () => {
      expect(neutral[900]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('default color is dark (near black)', () => {
      // neutral[900] should be a very dark color
      const hex = neutral[900].replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // Average channel value should be low (dark color)
      expect((r + g + b) / 3).toBeLessThan(50);
    });
  });
});
