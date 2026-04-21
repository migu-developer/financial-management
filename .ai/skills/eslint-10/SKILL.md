---
name: eslint-10
description: |
  ESLint 10 flat config patterns with TypeScript integration.
  TRIGGER when: creating or editing eslint.config.ts, fixing lint errors,
  or configuring linting rules for a package.
metadata:
  version: '10.2.0'
  catalog_ref: 'eslint: ^10.2.0'
  scope: [root]
  auto_invoke: 'When configuring ESLint or fixing lint issues'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# ESLint 10

## Version

eslint@10.2.0 (from pnpm catalog), typescript-eslint@8.58.0

## Critical Patterns

- Flat config only: `eslint.config.ts` (the eslintrc system is removed in v10)
- TypeScript config files require `jiti@>=2.2.0` or Node.js >= 22.13.0
- Use `defineConfig()` from `eslint/config` for type-safe configuration
- Use the shared config from `@packages/config/eslint` across all packages
- Extend with expo config in client packages: `eslint-config-expo/flat`
- Export a flat array of config objects (not a single object)
- Use `ignores` array at the top of the config for global ignores
- Integrate `typescript-eslint` for type-aware linting
- Use `languageOptions.parserOptions.tsconfigRootDir` pointing to `__dirname`

## Must NOT Do

- NEVER create `.eslintrc`, `.eslintrc.js`, `.eslintrc.json` -- flat config only
- NEVER use `extends` key in config objects (use spread/array composition)
- NEVER use `plugins` as strings -- import and reference plugin objects directly
- NEVER allow `console.log` in production code -- use Logger from Powertools
- NEVER allow `eval()` or `debugger` statements
- NEVER use `var` -- enforce `prefer-const` and `let`
- NEVER use `eslint-disable` without a specific rule name
- NEVER use jiti < 2.2.0 with ESLint 10 (breaks TypeScript config loading)

## Examples

### eslint.config.ts for a service package

```typescript
import path from 'path';
import { fileURLToPath } from 'url';

import { sharedConfig } from '@packages/config/eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ['dist/*', 'node_modules/', 'coverage/'],
  },
  sharedConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
];
```

### eslint.config.ts for client packages (with Expo)

```typescript
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
```

### Shared config definition (packages/config)

```typescript
import typescriptEslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export const sharedConfig = {
  plugins: {
    '@typescript-eslint': typescriptEslint.plugin,
    'react-hooks': reactHooks,
    'jsx-a11y': jsxA11y,
  },
  rules: {
    'no-console': 'error',
    'no-eval': 'error',
    'no-debugger': 'error',
    'prefer-const': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
```

### defineConfig() usage (type-safe)

```typescript
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'prefer-const': 'error',
    },
  },
]);
```

### Running lint

```bash
npx eslint .
npx eslint --fix .
```
