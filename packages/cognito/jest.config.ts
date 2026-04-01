import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: false }],
  },
  moduleNameMapper: {
    '^@custom-message/(.*)$': '<rootDir>/src/custom-message/$1',
    '^@user-sync/(.*)$': '<rootDir>/src/user-sync/$1',
    '^@pre-signup/(.*)$': '<rootDir>/src/pre-signup/$1',
    '^@packages/models/(.*)$': '<rootDir>/node_modules/@packages/models/src/$1',
    '^@services/shared/(.*)$': '<rootDir>/node_modules/@services/shared/src/$1',
    '^@services/users/(.*)$': '<rootDir>/node_modules/@services/users/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
