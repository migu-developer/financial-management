# @packages/config

Shared ESLint, Prettier, and TypeScript configuration presets for the financial management monorepo. Every other package in the workspace references these configs to enforce consistent code style and compiler settings.

## Responsibility

Provides a single source of truth for linting rules, formatting conventions, and TypeScript compiler options across all packages. Prevents configuration drift by centralizing settings that would otherwise be duplicated in each package.

## Exports

The package exposes four entry points via `package.json` exports:

| Export Path                           | File                  | Description                                            |
| ------------------------------------- | --------------------- | ------------------------------------------------------ |
| `@packages/config/eslint`             | `eslint.config.ts`    | ESLint flat configs (base, node, and helpers)          |
| `@packages/config/prettier`           | `prettier-preset.mjs` | Prettier formatting preset                             |
| `@packages/config/tsconfig`           | `tsconfig.base.json`  | Base TypeScript compiler options                       |
| `@packages/config/tsconfig.base.json` | `tsconfig.base.json`  | Alias for the base tsconfig                            |
| `@packages/config/tsconfig.expo.json` | `tsconfig.expo.json`  | TypeScript config extending base for Expo/React Native |

### ESLint (`eslint.config.ts`)

Exports the following named values:

- **`sharedConfig`** -- Standalone rules object (`no-console`, `eqeqeq`, `no-eval`, `no-debugger`, `prefer-const`) reusable without plugins.
- **`baseConfig`** -- Flat config array combining `typescript-eslint` recommended + `eslint-config-prettier`.
- **`nodeConfig`** -- `baseConfig` + `sharedConfig` for Node.js packages.
- **`getBaseConfig(tsconfigRootDir)`** -- Returns `baseConfig` with `parserOptions.tsconfigRootDir` set. Use in each package to resolve the correct tsconfig.
- **`getNodeConfig(tsconfigRootDir)`** -- Returns `nodeConfig` with `parserOptions.tsconfigRootDir` set.
- **default export** -- `getBaseConfig(__dirname)` for the config package itself.

### Prettier (`prettier-preset.mjs`)

| Option           | Value   |
| ---------------- | ------- |
| `bracketSpacing` | `true`  |
| `singleQuote`    | `true`  |
| `trailingComma`  | `'all'` |
| `printWidth`     | `80`    |
| `tabWidth`       | `2`     |

### TypeScript Base (`tsconfig.base.json`)

Key compiler options:

| Option                     | Value     |
| -------------------------- | --------- |
| `target`                   | `es2022`  |
| `module`                   | `ES2022`  |
| `moduleResolution`         | `bundler` |
| `strict`                   | `true`    |
| `isolatedModules`          | `true`    |
| `noUncheckedIndexedAccess` | `true`    |
| `declaration`              | `true`    |
| `declarationMap`           | `true`    |
| `sourceMap`                | `true`    |
| `resolveJsonModule`        | `true`    |
| `skipLibCheck`             | `true`    |

Excludes: `node_modules`, `.turbo`

### TypeScript Expo (`tsconfig.expo.json`)

Extends `tsconfig.base.json` with overrides for React Native / Expo:

| Option                           | Value               |
| -------------------------------- | ------------------- |
| `jsx`                            | `react-native`      |
| `module`                         | `preserve`          |
| `moduleDetection`                | `force`             |
| `target`                         | `ESNext`            |
| `lib`                            | `["DOM", "ESNext"]` |
| `customConditions`               | `["react-native"]`  |
| `noEmit`                         | `true`              |
| `declaration` / `declarationMap` | `false`             |

Additional excludes: `babel.config.js`, `metro.config.js`, `jest.config.js`, `android`, `ios`

## Structure

```
packages/config/
  eslint.config.ts        # ESLint flat config (base, node, getters)
  prettier-preset.mjs     # Prettier shared preset
  tsconfig.base.json      # Base TypeScript compiler options
  tsconfig.expo.json      # Expo/React Native TypeScript config
  package.json
```

## Usage

### ESLint (in a consuming package's `eslint.config.ts`)

```typescript
import { getNodeConfig } from '@packages/config/eslint';

export default getNodeConfig(__dirname);
```

### Prettier (in the workspace root `.prettierrc.mjs`)

```javascript
import preset from '@packages/config/prettier';
export default preset;
```

### TypeScript (in a consuming package's `tsconfig.json`)

```json
{
  "extends": "@packages/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

For Expo packages:

```json
{
  "extends": "@packages/config/tsconfig.expo.json",
  "include": ["**/*.ts", "**/*.tsx"]
}
```

## Dependencies

### External (devDependencies)

- `eslint` -- ESLint engine
- `prettier` -- Prettier engine
- `typescript` -- TypeScript compiler
- `eslint-config-prettier` -- Disables ESLint rules that conflict with Prettier
- `typescript-eslint` -- TypeScript ESLint parser and recommended rules

## Scripts

This package has no build or test scripts. It only provides configuration files consumed at development time by other packages.
