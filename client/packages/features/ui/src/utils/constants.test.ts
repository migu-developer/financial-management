import { ColorScheme, IconNames } from './constants';

describe('constants — design system enums', () => {
  describe('ColorScheme', () => {
    it('has LIGHT and DARK values', () => {
      expect(ColorScheme.LIGHT).toBe('light');
      expect(ColorScheme.DARK).toBe('dark');
    });

    it('only has two members', () => {
      const keys = Object.keys(ColorScheme).filter((k) => isNaN(Number(k)));
      expect(keys).toHaveLength(2);
      expect(keys).toContain('LIGHT');
      expect(keys).toContain('DARK');
    });
  });

  describe('IconNames', () => {
    it('has LIGHT and DARK values', () => {
      expect(IconNames.LIGHT).toBe('light-mode');
      expect(IconNames.DARK).toBe('dark-mode');
    });

    it('only has two members', () => {
      const keys = Object.keys(IconNames).filter((k) => isNaN(Number(k)));
      expect(keys).toHaveLength(2);
      expect(keys).toContain('LIGHT');
      expect(keys).toContain('DARK');
    });

    it('values are valid MaterialIcons names (non-empty strings)', () => {
      expect(IconNames.LIGHT.length).toBeGreaterThan(0);
      expect(IconNames.DARK.length).toBeGreaterThan(0);
    });
  });
});
