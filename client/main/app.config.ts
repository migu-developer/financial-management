import type { ConfigContext, ExpoConfig } from 'expo/config';
import { primary, surface } from '@features/ui/utils/colors';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Financial Management',
  slug: 'financial-management',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'expoapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    // bundleIdentifier: set when integrating with EAS
    // e.g. bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER ?? 'com.migudev.financialmanagement',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: primary[50],
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    // package: set when integrating with EAS
    // e.g. package: process.env.ANDROID_PACKAGE ?? 'com.migudev.financialmanagement',
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: surface.light.card,
        dark: {
          backgroundColor: surface.dark.background,
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
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
