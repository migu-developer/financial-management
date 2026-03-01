import { nodeConfig } from '@packages/config/eslint';

export default [
  { ignores: ['node_modules/'] },
  ...(Array.isArray(nodeConfig) ? nodeConfig : [nodeConfig]),
  {
    rules: {
      'no-new': 'off',
    },
  },
];
