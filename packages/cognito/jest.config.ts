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
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
