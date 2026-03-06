import {
  primary,
  accent,
  neutral,
  surface,
  textTokens,
  success,
  warning,
  uiTokens,
  colors,
} from './colors';

describe('colors — design system palette', () => {
  describe('primary (teal)', () => {
    it('exports a numeric scale from 50 to 950', () => {
      const scale = [
        50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
      ] as const;
      scale.forEach((step) => {
        expect(primary[step]).toBeDefined();
        expect(typeof primary[step]).toBe('string');
      });
    });

    it('DEFAULT is the same as 600', () => {
      expect(primary.DEFAULT).toBe(primary[600]);
    });

    it('named aliases map to correct numeric values', () => {
      expect(primary.dark).toBe(primary[700]);
      expect(primary.mid).toBe(primary[500]);
      expect(primary.light).toBe(primary[400]);
      expect(primary.pale).toBe(primary[50]);
    });

    it('primary[600] is #2A7C8F', () => {
      expect(primary[600]).toBe('#2A7C8F');
    });
  });

  describe('accent (lavender)', () => {
    it('exports a numeric scale from 50 to 700', () => {
      const scale = [50, 100, 200, 300, 400, 500, 600, 700] as const;
      scale.forEach((step) => {
        expect(accent[step]).toBeDefined();
        expect(typeof accent[step]).toBe('string');
      });
    });

    it('DEFAULT is the same as 400', () => {
      expect(accent.DEFAULT).toBe(accent[400]);
    });

    it('accent[600] is #9A7CD4', () => {
      expect(accent[600]).toBe('#9A7CD4');
    });
  });

  describe('neutral (gray scale)', () => {
    it('exports steps from 50 to 900', () => {
      const scale = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
      scale.forEach((step) => {
        expect(neutral[step]).toBeDefined();
        expect(typeof neutral[step]).toBe('string');
      });
    });
  });

  describe('success (emerald)', () => {
    it('exports 50, 100, 500 and DEFAULT', () => {
      expect(success[50]).toBeDefined();
      expect(success[100]).toBeDefined();
      expect(success[500]).toBeDefined();
      expect(success.DEFAULT).toBeDefined();
    });

    it('DEFAULT equals #10B981', () => {
      expect(success.DEFAULT).toBe('#10B981');
    });

    it('DEFAULT equals 500', () => {
      expect(success.DEFAULT).toBe(success[500]);
    });
  });

  describe('warning (amber)', () => {
    it('exports 50, 100, 500 and DEFAULT', () => {
      expect(warning[50]).toBeDefined();
      expect(warning[100]).toBeDefined();
      expect(warning[500]).toBeDefined();
      expect(warning.DEFAULT).toBeDefined();
    });

    it('DEFAULT equals #F59E0B', () => {
      expect(warning.DEFAULT).toBe('#F59E0B');
    });

    it('DEFAULT equals 500', () => {
      expect(warning.DEFAULT).toBe(warning[500]);
    });
  });

  describe('surface tokens', () => {
    it('has light and dark variants', () => {
      expect(surface.light).toBeDefined();
      expect(surface.dark).toBeDefined();
    });

    it('light variant has background, card, border, subtle', () => {
      expect(surface.light.background).toBeDefined();
      expect(surface.light.card).toBeDefined();
      expect(surface.light.border).toBeDefined();
      expect(surface.light.subtle).toBeDefined();
    });

    it('dark variant has background, card, border, subtle', () => {
      expect(surface.dark.background).toBeDefined();
      expect(surface.dark.card).toBeDefined();
      expect(surface.dark.border).toBeDefined();
      expect(surface.dark.subtle).toBeDefined();
    });
  });

  describe('textTokens', () => {
    it('has light and dark variants', () => {
      expect(textTokens.light).toBeDefined();
      expect(textTokens.dark).toBeDefined();
    });

    it('light has primary, secondary, muted, inverse', () => {
      expect(textTokens.light.primary).toBeDefined();
      expect(textTokens.light.secondary).toBeDefined();
      expect(textTokens.light.muted).toBeDefined();
      expect(textTokens.light.inverse).toBeDefined();
    });

    it('dark has primary, secondary, muted, inverse', () => {
      expect(textTokens.dark.primary).toBeDefined();
      expect(textTokens.dark.secondary).toBeDefined();
      expect(textTokens.dark.muted).toBeDefined();
      expect(textTokens.dark.inverse).toBeDefined();
    });
  });

  describe('uiTokens', () => {
    it('has sunColor and moonColor', () => {
      expect(uiTokens.sunColor).toBe('#FCD34D');
      expect(uiTokens.moonColor).toBe('#94A3B8');
    });
  });

  describe('colors (Tailwind-compatible object)', () => {
    it('includes primary, accent, neutral, success, warning, link, link-hover', () => {
      expect(colors.primary).toBe(primary);
      expect(colors.accent).toBe(accent);
      expect(colors.neutral).toBe(neutral);
      expect(colors.success).toBe(success);
      expect(colors.warning).toBe(warning);
      expect(colors.link).toBe(primary[600]);
      expect(colors['link-hover']).toBe(primary[500]);
    });
  });
});
