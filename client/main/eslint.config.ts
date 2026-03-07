import path from 'path';
import { fileURLToPath } from 'url';

import { sharedConfig } from '@packages/config/eslint';
import expoConfig from 'eslint-config-expo/flat';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ['dist/*', 'node_modules/'],
  },
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  sharedConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
];
