import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lib', '<rootDir>/bin'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@utils/(.*)$': '<rootDir>/lib/utils/$1',
    '^@config/(.*)$': '<rootDir>/lib/config/$1',
    '^@core/(.*)$': '<rootDir>/lib/core/$1',
    '^@versions/(.*)$': '<rootDir>/lib/versions/$1',
  },
};

export default config;
