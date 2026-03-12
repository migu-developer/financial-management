import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: false, tsconfig: { jsx: 'react' } }],
  },
  moduleNameMapper: {
    // CSS / style imports
    '\\.css$': '<rootDir>/tests/__mocks__/style.ts',
    // Internal path aliases
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/(.*)$': '<rootDir>/$1',
    // Workspace packages
    '^@packages/i18n$': '<rootDir>/../packages/i18n/src/index.ts',
    '^@packages/i18n/(.*)$': '<rootDir>/../packages/i18n/src/$1',
    '^@packages/utils$': '<rootDir>/../packages/utils/src/index.ts',
    '^@features/auth$': '<rootDir>/../packages/features/auth/src/index.ts',
    '^@features/auth/(.*)$': '<rootDir>/../packages/features/auth/src/$1',
    '^@features/dashboard$':
      '<rootDir>/../packages/features/dashboard/src/index.ts',
    '^@features/dashboard/(.*)$':
      '<rootDir>/../packages/features/dashboard/src/$1',
    '^@features/landing$':
      '<rootDir>/../packages/features/landing/src/index.ts',
    '^@features/landing/(.*)$': '<rootDir>/../packages/features/landing/src/$1',
    '^@features/ui$': '<rootDir>/../packages/features/ui/src/index.ts',
    '^@features/ui/(.*)$': '<rootDir>/../packages/features/ui/src/$1',
    // Native / Expo mocks
    '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
    '^react-native-reanimated$':
      '<rootDir>/tests/__mocks__/react-native-reanimated.ts',
    '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.ts',
    '^expo-splash-screen$': '<rootDir>/tests/__mocks__/expo-splash-screen.ts',
    '^expo-status-bar$': '<rootDir>/tests/__mocks__/expo-status-bar.ts',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/tests/__mocks__/async-storage.ts',
    '^@expo/vector-icons$': '<rootDir>/tests/__mocks__/expo-vector-icons.ts',
    '^nativewind$': '<rootDir>/tests/__mocks__/nativewind.ts',
    '^expo-linking$': '<rootDir>/tests/__mocks__/expo-linking.ts',
    '^react-native-qrcode-svg$':
      '<rootDir>/tests/__mocks__/react-native-qrcode-svg.ts',
  },
  transformIgnorePatterns: ['/node_modules/(?!(i18next|react-i18next)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'scripts/**/*.ts',
    'app/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
