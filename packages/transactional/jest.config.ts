import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.env.ts'],
  roots: [
    '<rootDir>/components',
    '<rootDir>/config',
    '<rootDir>/emails',
    '<rootDir>/scripts',
    '<rootDir>/utils',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: false }],
  },
  // Allow ts-jest to transform @features/ui even when resolved through node_modules symlink
  transformIgnorePatterns: ['/node_modules/(?!@features/ui)'],
  moduleNameMapper: {
    '^@root/(.*)$': '<rootDir>/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@features/ui/src/utils/colors$':
      '<rootDir>/../../client/packages/features/ui/src/utils/colors.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'config/**/*.ts',
    'emails/**/*.{ts,tsx}',
    'scripts/lib/**/*.ts',
    'utils/**/*.ts',
    '!**/*.test.{ts,tsx}',
    '!**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
