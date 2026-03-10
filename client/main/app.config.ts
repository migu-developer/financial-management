import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Sincronized with the design system colors.
 * reference: @features/ui/src/utils/colors.ts
 */
const colors = {
  primary: {
    50: '#E8F7F2',
  },
  surface: {
    light: {
      card: '#FFFFFF',
    },
    dark: {
      background: '#0f172a',
    },
  },
};

/**
 * `newArchEnabled` is not yet in the official ExpoConfig typings for all SDK
 * versions, so we extend the type to avoid TypeScript errors.
 */
type ExpoConfigWithNewArch = ExpoConfig & {
  newArchEnabled?: boolean;
};

/**
 * EAS project ID.
 * No security sensitive, it's public.
 */
const EAS_PROJECT_ID = 'b3d6baaa-5bfb-4085-b5eb-ff956ca852f1';

/**
 * Returns the unique app identifier (bundle ID / package name / URL scheme)
 * based on the build variant. Reads from process.env at call-time so it can
 * be tested with different variants by setting the env before calling.
 */
export const getAppId = (variant = process.env.APP_VARIANT): string =>
  variant === 'development'
    ? 'com.migudev.dev.financialmanagement.app'
    : 'com.migudev.prod.financialmanagement.app';

/**
 * Returns the human-readable app name based on the build variant.
 */
export const getAppName = (variant = process.env.APP_VARIANT): string =>
  variant === 'development'
    ? 'Financial Management (Development)'
    : 'Financial Management';

export default ({ config }: ConfigContext): ExpoConfigWithNewArch => ({
  ...config,
  owner: 'migudev',
  name: getAppName(),
  slug: 'financial-management',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: getAppId(),
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    usesAppleSignIn: true,
    bundleIdentifier: getAppId(),
    infoPlist: {
      // Avoids the App Store encryption compliance questionnaire for apps
      // that only use Apple's built-in encryption (TLS/HTTPS).
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: colors.primary[50],
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: getAppId(),
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: colors.surface.light.card,
        dark: {
          backgroundColor: colors.surface.dark.background,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  runtimeVersion: {
    policy: 'sdkVersion',
  },
});
