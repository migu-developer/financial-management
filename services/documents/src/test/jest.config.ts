import type { Config } from 'jest';

const config: Config = {
  rootDir: '../..',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/test'],
  testMatch: ['**/*.integration.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: false }],
  },
  moduleNameMapper: {
    '^@services/documents/(.*)$': '<rootDir>/src/$1',
    '^@packages/models/(.*)$': '<rootDir>/node_modules/@packages/models/src/$1',
    '^@services/shared/(.*)$': '<rootDir>/node_modules/@services/shared/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
};

export default config;
