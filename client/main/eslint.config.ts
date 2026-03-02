import { sharedConfig } from '@packages/config/eslint';
import expoConfig from 'eslint-config-expo/flat';

export default [
  {
    ignores: ['dist/*', 'node_modules/'],
  },
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  sharedConfig,
];
