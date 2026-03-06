import { uiTokens } from '../../../utils/colors';
import { ColorScheme, IconNames } from '../../../utils/constants';

describe('ThemeToggle component', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.ThemeToggle).toBe('function');
  });

  describe('design tokens used by ThemeToggle', () => {
    it('uiTokens.sunColor is used for the light-mode icon', () => {
      expect(uiTokens.sunColor).toBe('#FCD34D');
      expect(uiTokens.sunColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('uiTokens.moonColor is used for the dark-mode icon', () => {
      expect(uiTokens.moonColor).toBe('#94A3B8');
      expect(uiTokens.moonColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('sun and moon colors are distinct', () => {
      expect(uiTokens.sunColor).not.toBe(uiTokens.moonColor);
    });
  });

  describe('icon name constants', () => {
    it('LIGHT icon name is "light-mode"', () => {
      expect(IconNames.LIGHT).toBe('light-mode');
    });

    it('DARK icon name is "dark-mode"', () => {
      expect(IconNames.DARK).toBe('dark-mode');
    });
  });

  describe('color scheme constants', () => {
    it('ColorScheme.DARK is "dark"', () => {
      expect(ColorScheme.DARK).toBe('dark');
    });

    it('ColorScheme.LIGHT is "light"', () => {
      expect(ColorScheme.LIGHT).toBe('light');
    });
  });
});
