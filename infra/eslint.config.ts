import path from 'path';
import { fileURLToPath } from 'url';

import { nodeConfig } from '@packages/config/eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  { ignores: ['dist/', 'cdk.out/', 'node_modules/'] },
  ...(Array.isArray(nodeConfig) ? nodeConfig : [nodeConfig]),
  {
    rules: {
      'no-new': 'off',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
];
