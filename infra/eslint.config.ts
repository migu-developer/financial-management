import path from 'path';
import { fileURLToPath } from 'url';

import { cdkConfig } from '@repo/config/eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  { ignores: ['dist/', 'cdk.out/', 'node_modules/'] },
  ...(Array.isArray(cdkConfig) ? cdkConfig : [cdkConfig]),
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
];
