import appConfigFn from '@/app.config';
import { primary, surface } from '@features/ui/utils/colors';

const config = appConfigFn({
  config: {},
  projectRoot: '/',
  staticConfigPath: null,
  packageJsonPath: null,
});

describe('app.config', () => {
  describe('app identity', () => {
    it('has correct name and slug', () => {
      expect(config.name).toBe('Financial Management');
      expect(config.slug).toBe('financial-management');
    });

    it('has correct version and scheme', () => {
      expect(config.version).toBe('1.0.0');
      expect(config.scheme).toBe('expoapp');
    });

    it('sets portrait orientation', () => {
      expect(config.orientation).toBe('portrait');
    });

    it('enables new architecture', () => {
      expect(config.newArchEnabled).toBe(true);
    });
  });

  describe('asset paths', () => {
    it('points icon to images directory', () => {
      expect(config.icon).toBe('./assets/images/icon.png');
    });

    it('points android foreground image to images directory', () => {
      expect(config.android?.adaptiveIcon?.foregroundImage).toBe(
        './assets/images/android-icon-foreground.png',
      );
    });

    it('points android monochrome image to images directory', () => {
      expect(config.android?.adaptiveIcon?.monochromeImage).toBe(
        './assets/images/android-icon-monochrome.png',
      );
    });

    it('points web favicon to images directory', () => {
      expect(config.web?.favicon).toBe('./assets/images/favicon.png');
    });
  });

  describe('design system colors', () => {
    it('uses primary[50] for android adaptive icon background', () => {
      expect(config.android?.adaptiveIcon?.backgroundColor).toBe(primary[50]);
    });

    it('uses surface.light.card for splash light background', () => {
      const splashPlugin = config.plugins?.find(
        (p): p is [string, Record<string, unknown>] =>
          Array.isArray(p) && p[0] === 'expo-splash-screen',
      );
      expect(splashPlugin).toBeDefined();
      const splashConfig = splashPlugin![1] as {
        backgroundColor: string;
        dark: { backgroundColor: string };
      };
      expect(splashConfig.backgroundColor).toBe(surface.light.card);
    });

    it('uses surface.dark.background for splash dark background', () => {
      const splashPlugin = config.plugins?.find(
        (p): p is [string, Record<string, unknown>] =>
          Array.isArray(p) && p[0] === 'expo-splash-screen',
      );
      const splashConfig = splashPlugin![1] as {
        backgroundColor: string;
        dark: { backgroundColor: string };
      };
      expect(splashConfig.dark.backgroundColor).toBe(surface.dark.background);
    });
  });

  describe('plugins', () => {
    it('includes expo-router', () => {
      expect(config.plugins).toContain('expo-router');
    });

    it('includes expo-splash-screen with correct image config', () => {
      const splashPlugin = config.plugins?.find(
        (p): p is [string, Record<string, unknown>] =>
          Array.isArray(p) && p[0] === 'expo-splash-screen',
      );
      expect(splashPlugin).toBeDefined();
      const splashConfig = splashPlugin![1] as Record<string, unknown>;
      expect(splashConfig.image).toBe('./assets/images/splash-icon.png');
      expect(splashConfig.imageWidth).toBe(200);
      expect(splashConfig.resizeMode).toBe('contain');
    });
  });

  describe('experiments', () => {
    it('enables typed routes', () => {
      expect(config.experiments?.typedRoutes).toBe(true);
    });

    it('enables react compiler', () => {
      expect(config.experiments?.reactCompiler).toBe(true);
    });
  });

  describe('EAS configuration', () => {
    it('reads EAS project ID from environment variable', () => {
      const originalEnv = process.env.EAS_PROJECT_ID;
      process.env.EAS_PROJECT_ID = 'test-project-id';
      const configWithEnv = appConfigFn({
        config: {},
        projectRoot: '/',
        staticConfigPath: null,
        packageJsonPath: null,
      });
      expect(configWithEnv.extra?.eas?.projectId).toBe('test-project-id');
      process.env.EAS_PROJECT_ID = originalEnv;
    });

    it('returns undefined EAS project ID when env var is not set', () => {
      const originalEnv = process.env.EAS_PROJECT_ID;
      delete process.env.EAS_PROJECT_ID;
      const configWithoutEnv = appConfigFn({
        config: {},
        projectRoot: '/',
        staticConfigPath: null,
        packageJsonPath: null,
      });
      expect(configWithoutEnv.extra?.eas?.projectId).toBeUndefined();
      process.env.EAS_PROJECT_ID = originalEnv;
    });
  });

  describe('platform config', () => {
    it('enables tablet support on iOS', () => {
      expect(config.ios?.supportsTablet).toBe(true);
    });

    it('enables edge-to-edge on Android', () => {
      expect(config.android?.edgeToEdgeEnabled).toBe(true);
    });

    it('disables predictive back gesture on Android', () => {
      expect(config.android?.predictiveBackGestureEnabled).toBe(false);
    });

    it('sets web output to static', () => {
      expect(config.web?.output).toBe('static');
    });
  });
});
