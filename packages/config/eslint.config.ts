import path from 'path';
import { fileURLToPath } from 'url';

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

const baseConfigArray = Array.isArray(baseConfig) ? baseConfig : [baseConfig];
const nodeConfigArray = Array.isArray(nodeConfig) ? nodeConfig : [nodeConfig];

/** Base config with tsconfigRootDir set. Use in each package to fix "multiple candidate TSConfigRootDirs" in the editor. */
export function getBaseConfig(tsconfigRootDir: string): Config[] {
  return [
    ...baseConfigArray,
    {
      languageOptions: {
        parserOptions: {
          tsconfigRootDir,
        },
      },
    },
  ];
}

/** Node config with tsconfigRootDir set. Use in each package to fix "multiple candidate TSConfigRootDirs" in the editor. */
export function getNodeConfig(tsconfigRootDir: string): Config[] {
  return [
    ...nodeConfigArray,
    {
      languageOptions: {
        parserOptions: {
          tsconfigRootDir,
        },
      },
    },
  ];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default getBaseConfig(__dirname);
