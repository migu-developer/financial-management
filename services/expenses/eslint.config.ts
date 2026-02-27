import path from 'path';
import { fileURLToPath } from 'url';

import { nodeConfig } from '@packages/config/eslint';
import { defineConfig } from 'eslint/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const base = Array.isArray(nodeConfig) ? nodeConfig : [nodeConfig];

export default defineConfig([
  ...base,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
    },
  },
]);
