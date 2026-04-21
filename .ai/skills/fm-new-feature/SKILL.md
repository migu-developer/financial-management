---
name: fm-new-feature
description: |
  Step-by-step guide to create a new client feature package following DDD patterns.
  Uses client/packages/features/auth/ as the reference implementation.
  TRIGGER when: creating a new client feature, adding a new screen/flow, or scaffolding a feature package.
metadata:
  version: '1.0'
  scope: [client]
  auto_invoke: 'Creating a new client feature'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# fm-new-feature -- Create a New Client Feature Package

## Version

1.0

## Reference

Use `client/packages/features/auth/` as the canonical reference for structure and patterns.

## Steps

### 1. Create feature directory

```bash
mkdir -p client/packages/features/{name}/src/{domain/{entities,repositories,errors,value-objects},application/use-cases,infrastructure,presentation/{pages,components/shared/{atoms,molecules,templates},hooks,providers}}
```

### 2. Create package.json

Copy `client/packages/features/auth/package.json`, rename `@features/auth` to `@features/{name}`.
Key dependencies: `@features/ui`, `@packages/i18n`, `@packages/utils` (all `workspace:*`).
Peer dependencies: `react: "catalog:"`, `react-native: "catalog:"` (never use `"*"`).
Dev dependencies: `@packages/config`, `nativewind`, `jest`, `ts-jest`, `typescript` (all `catalog:`).

### 3. Create tsconfig.json

Extend the shared base config from `@packages/config`.

### 4. Create src/index.ts

Export the public API of the feature (pages, providers, hooks, types).

### 5. Implement source layers

**Domain layer** (`src/domain/`):

- `entities/` -- Domain entities with validation logic
- `repositories/` -- Port interfaces (e.g. `{name}-repository.port.ts`)
- `errors/` -- Domain-specific error classes
- `value-objects/` -- Typed value objects with validation
- `utils/` -- Domain constants and helpers

**Application layer** (`src/application/use-cases/`):

- One use-case per file, receives repository port via injection
- Example: `create-{entity}.use-case.ts`, `get-{entity}.use-case.ts`

**Infrastructure layer** (`src/infrastructure/`):

- Adapter implementations of domain repository ports
- API clients, storage adapters, third-party SDK wrappers
- Example: `api-{name}-repository.ts` (implements the port)

**Presentation layer** (`src/presentation/`):

- `pages/` -- Screen components, one directory per page (`{page}/index.tsx`)
- `components/shared/atoms/` -- Small reusable UI elements
- `components/shared/molecules/` -- Composed UI elements
- `components/shared/templates/` -- Full page layout templates
- `hooks/` -- Custom React hooks for the feature
- `providers/` -- Context providers (state management)

### 6. Add tests

Place test files alongside source files using the `{name}.test.ts(x)` convention.
Use the `src/__mocks__/` directory for module mocks (e.g. `react-native.ts`, `nativewind.ts`).

### 7. Register in client/main

- Add `@features/{name}` as a dependency in `client/main/package.json`
- Import pages and register them in the navigation router
- Add the feature provider to the app's provider tree if needed

### 8. Add i18n namespace

If the feature needs translations, add a namespace in `packages/i18n/`.

### 9. Install and verify

```bash
pnpm install
cd client/packages/features/{name} && pnpm test
cd client/main && pnpm typecheck
```

## Critical Patterns

- Use `catalog:` for peer dependencies (react, react-native) to unify pnpm virtual store entries
- Follow the DDD layer separation strictly: domain has no external dependencies
- Use `@features/ui` for shared design system components
- Use `@packages/i18n` for all user-facing strings
- Every component and hook must have a co-located test file

## Must NOT Do

- Use `"*"` for react/react-native peer dependencies (causes NativeWind className errors)
- Import infrastructure directly from domain or application layers
- Put business logic in presentation components
- Skip adding the feature to client/main navigation
- Create components without co-located tests
