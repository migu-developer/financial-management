import appConfigFn, { getAppId, getAppName } from '@/app.config';
import { primary, surface } from '@features/ui/utils/colors';

const baseArgs = {
  config: {},
  projectRoot: '/' as const,
  staticConfigPath: null,
  packageJsonPath: null,
};

// Default config: no APP_VARIANT set → production values
const config = appConfigFn(baseArgs);

describe('app.config', () => {
  describe('getAppId', () => {
    it('returns production id when variant is undefined', () => {
      expect(getAppId(undefined)).toBe(
        'com.migudev.prod.financialmanagement.app',
      );
    });

    it('returns production id when variant is "production"', () => {
      expect(getAppId('production')).toBe(
        'com.migudev.prod.financialmanagement.app',
      );
    });

    it('returns development id when variant is "development"', () => {
      expect(getAppId('development')).toBe(
        'com.migudev.dev.financialmanagement.app',
      );
    });

    it('reads APP_VARIANT from process.env when no argument is passed', () => {
      const original = process.env.APP_VARIANT;

      process.env.APP_VARIANT = 'development';
      expect(getAppId()).toBe('com.migudev.dev.financialmanagement.app');

      delete process.env.APP_VARIANT;
      expect(getAppId()).toBe('com.migudev.prod.financialmanagement.app');

      process.env.APP_VARIANT = original;
    });
  });

  describe('getAppName', () => {
    it('returns production name when variant is undefined', () => {
      expect(getAppName(undefined)).toBe('Financial Management');
    });

    it('returns production name when variant is "production"', () => {
      expect(getAppName('production')).toBe('Financial Management');
    });

    it('returns development name when variant is "development"', () => {
      expect(getAppName('development')).toBe(
        'Financial Management (Development)',
      );
    });

    it('reads APP_VARIANT from process.env when no argument is passed', () => {
      const original = process.env.APP_VARIANT;

      process.env.APP_VARIANT = 'development';
      expect(getAppName()).toBe('Financial Management (Development)');

      delete process.env.APP_VARIANT;
      expect(getAppName()).toBe('Financial Management');

      process.env.APP_VARIANT = original;
    });
  });

  describe('app identity (production variant)', () => {
    it('has correct name and slug', () => {
      expect(config.name).toBe('Financial Management');
      expect(config.slug).toBe('financial-management');
    });

    it('has correct version and scheme', () => {
      expect(config.version).toBe('1.0.0');
      expect(config.scheme).toBe('com.migudev.prod.financialmanagement.app');
    });

    it('sets portrait orientation', () => {
      expect(config.orientation).toBe('portrait');
    });

    it('enables new architecture', () => {
      expect(config.newArchEnabled).toBe(true);
    });
  });

  describe('app identity (development variant)', () => {
    let developmentConfig: ReturnType<typeof appConfigFn>;

    beforeAll(() => {
      process.env.APP_VARIANT = 'development';
      developmentConfig = appConfigFn(baseArgs);
      delete process.env.APP_VARIANT;
    });

    it('uses development app name', () => {
      expect(developmentConfig.name).toBe('Financial Management (Development)');
    });

    it('uses development scheme', () => {
      expect(developmentConfig.scheme).toBe(
        'com.migudev.dev.financialmanagement.app',
      );
    });

    it('uses development iOS bundle identifier', () => {
      expect(developmentConfig.ios?.bundleIdentifier).toBe(
        'com.migudev.dev.financialmanagement.app',
      );
    });

    it('uses development Android package', () => {
      expect(developmentConfig.android?.package).toBe(
        'com.migudev.dev.financialmanagement.app',
      );
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

    it('includes expo-secure-store', () => {
      expect(config.plugins).toContain('expo-secure-store');
    });

    it('includes expo-web-browser', () => {
      expect(config.plugins).toContain('expo-web-browser');
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

  describe('iOS config', () => {
    it('enables tablet support', () => {
      expect(config.ios?.supportsTablet).toBe(true);
    });

    it('declares Apple Sign In usage', () => {
      expect(config.ios?.usesAppleSignIn).toBe(true);
    });

    it('marks app as not using non-exempt encryption', () => {
      expect(
        (config.ios?.infoPlist as Record<string, unknown>)
          ?.ITSAppUsesNonExemptEncryption,
      ).toBe(false);
    });

    it('sets bundle identifier to production id by default', () => {
      expect(config.ios?.bundleIdentifier).toBe(
        'com.migudev.prod.financialmanagement.app',
      );
    });
  });

  describe('Android config', () => {
    it('enables edge-to-edge', () => {
      expect(config.android?.edgeToEdgeEnabled).toBe(true);
    });

    it('disables predictive back gesture', () => {
      expect(config.android?.predictiveBackGestureEnabled).toBe(false);
    });

    it('sets package to production id by default', () => {
      expect(config.android?.package).toBe(
        'com.migudev.prod.financialmanagement.app',
      );
    });
  });

  describe('web config', () => {
    it('sets web output to static', () => {
      expect(config.web?.output).toBe('static');
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
    const PROJECT_ID = 'b3d6baaa-5bfb-4085-b5eb-ff956ca852f1';

    it('has the EAS project ID hardcoded', () => {
      expect(config.extra?.eas?.projectId).toBe(PROJECT_ID);
    });

    it('builds OTA updates URL from the hardcoded project ID', () => {
      expect(config.updates?.url).toBe(`https://u.expo.dev/${PROJECT_ID}`);
    });
  });
});
