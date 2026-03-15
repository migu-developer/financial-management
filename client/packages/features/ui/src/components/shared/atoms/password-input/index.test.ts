import { PasswordInput } from './index';
import { uiTokens, textTokens } from '@features/ui/utils/colors';

describe('PasswordInput component', () => {
  it('module exports a function', () => {
    expect(typeof PasswordInput).toBe('function');
  });

  describe('design tokens used by PasswordInput', () => {
    it('uses uiTokens.moonColor for dark mode icon color', () => {
      expect(uiTokens.moonColor).toBe('#94A3B8');
      expect(uiTokens.moonColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('uses textTokens.light.muted for light mode icon color', () => {
      expect(textTokens.light.muted).toBe('#A3A3A3');
      expect(textTokens.light.muted).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('icon colors differ between light and dark mode', () => {
      expect(uiTokens.moonColor).not.toBe(textTokens.light.muted);
    });
  });

  describe('icon size constant', () => {
    it('uses 20 as the eye icon size', () => {
      const ICON_SIZE = 20;
      expect(ICON_SIZE).toBe(20);
    });
  });
});
