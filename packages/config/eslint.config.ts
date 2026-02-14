import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export const baseConfig = defineConfig(
  tseslint.configs.eslintRecommended,
  tseslint.configs.recommended,
  prettier,
);

export const nodeConfig = defineConfig(baseConfig, {
  rules: {
    'no-console': 'warn',
  },
});

export const cdkConfig = defineConfig(baseConfig, {
  rules: {
    'no-new': 'off',
  },
});
