import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: false, tsconfig: { jsx: 'react' } }],
  },
  moduleNameMapper: {
    '^@packages/i18n$': '<rootDir>/../../i18n/src/index.ts',
    '^@packages/i18n/(.*)$': '<rootDir>/../../i18n/src/$1',
    '^@packages/utils$': '<rootDir>/../../utils/src/index.ts',
    '^@features/ui$': '<rootDir>/../ui/src/index.ts',
    '^@features/ui/hooks/(.*)$': '<rootDir>/../ui/src/hooks/$1',
    '^@features/ui/utils/(.*)$': '<rootDir>/../ui/src/utils/$1',
    '^@features/dashboard$': '<rootDir>/src/index.ts',
    '^@features/dashboard/presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^@expo/vector-icons$': '<rootDir>/src/__mocks__/expo-vector-icons.ts',
    '^nativewind$': '<rootDir>/src/__mocks__/nativewind.ts',
  },
  transformIgnorePatterns: ['/node_modules/(?!(i18next|react-i18next)/)/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/__mocks__/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
