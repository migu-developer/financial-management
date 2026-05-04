import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: false, tsconfig: { jsx: 'react' } }],
  },
  moduleNameMapper: {
    '^@features/ui$': '<rootDir>/src/index.ts',
    '^@features/ui/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@features/ui/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@features/ui/components/(.*)$': '<rootDir>/src/components/$1',
    '^@features/ui/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@packages/utils$': '<rootDir>/../../utils/src/index.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^@expo/vector-icons$': '<rootDir>/src/__mocks__/expo-vector-icons.ts',
    '^nativewind$': '<rootDir>/src/__mocks__/nativewind.ts',
    '^@packages/models/(.*)$': '<rootDir>/node_modules/@packages/models/src/$1',
    '^@packages/i18n$': '<rootDir>/../../i18n/src/index.ts',
    '^@packages/i18n/(.*)$': '<rootDir>/../../i18n/src/$1',
  },
  transformIgnorePatterns: ['/node_modules/(?!(i18next|react-i18next)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    '!src/**/*.test.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
