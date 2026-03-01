import { Config, defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/** Shared rules to reuse in other configs (e.g. Expo) without merging full config + plugins. */
export const sharedConfig: Config = {
  rules: {
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
    'no-eval': 'error',
    'no-debugger': 'error',
    'prefer-const': 'warn',
  },
};

export const baseConfig = defineConfig(
  tseslint.configs.eslintRecommended,
  tseslint.configs.recommended,
  prettier,
);

export const nodeConfig = defineConfig(baseConfig, sharedConfig);
