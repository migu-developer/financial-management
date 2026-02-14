import type { UserConfig } from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'project',
        'client',
        'server',
        'loyalty',
        'config',
        'payments',
        'users',
        'files',
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [
      2,
      'always',
      ['sentence-case', 'upper-case', 'lower-case'],
    ],
  },
};

export default Configuration;
