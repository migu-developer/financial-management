import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: false }],
  },
  moduleNameMapper: {
    '^@notifications/domain/types$': '<rootDir>/src/domain/types.ts',
    '^@services/shared/(.*)$': '<rootDir>/node_modules/@services/shared/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
