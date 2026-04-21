---
name: typescript-5.9
description: |
  TypeScript 5.9 strict patterns for the financial-management monorepo.
  TRIGGER when: creating or editing any .ts or .tsx file, configuring tsconfig.json,
  or reviewing type safety.
metadata:
  version: '5.9.3'
  catalog_ref: 'typescript: ^5.9.3'
  scope: [root]
  auto_invoke: 'When writing or editing TypeScript files'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# TypeScript 5.9

## Version

typescript@5.9.3 (from pnpm catalog)

## Critical Patterns

- Enable strict mode in every tsconfig.json: `"strict": true`
- Enable `"noUncheckedIndexedAccess": true` to force undefined checks on index access
- Target ES2022: `"target": "ES2022"` for top-level await, cause on Error, Array.at()
- Use `"moduleResolution": "bundler"` for monorepo packages resolved by bundlers
- Use `"module": "ESNext"` for ESM output
- Never use `any` -- use `unknown` and narrow with type guards
- Use `satisfies` operator to validate types without widening
- Use `as const` assertions for literal types and readonly tuples
- Use `import defer` for deferred module evaluation on heavy imports
- Use discriminated unions over optional properties for state modeling
- Use `readonly` on arrays and objects that should not be mutated
- Prefer `interface` for object shapes, `type` for unions and intersections

## Must NOT Do

- NEVER use `any` -- use `unknown`, generics, or explicit types
- NEVER use `@ts-ignore` -- use `@ts-expect-error` with explanation if truly needed
- NEVER use `as` type assertions to bypass the type system (narrow instead)
- NEVER disable strict checks: `strictNullChecks`, `strictFunctionTypes`, etc.
- NEVER use `enum` -- use `as const` objects or union types instead
- NEVER use `namespace` -- use ES modules
- NEVER use `/// <reference>` except for ambient type augmentation (e.g., nativewind-env.d.ts)
- NEVER leave unused imports or variables (enable `noUnusedLocals`, `noUnusedParameters`)

## tsconfig.json Base Pattern

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

## Examples

### Use unknown instead of any

```typescript
// BAD
function parse(input: any): string {
  return input.name;
}

// GOOD
function parse(input: unknown): string {
  if (typeof input === 'object' && input !== null && 'name' in input) {
    return String((input as { name: unknown }).name);
  }
  throw new Error('Invalid input');
}
```

### Use satisfies for type validation

```typescript
type Route = '/home' | '/settings' | '/profile';
const routes = {
  home: '/home',
  settings: '/settings',
  profile: '/profile',
} as const satisfies Record<string, Route>;
```

### Use const assertions for literal types

```typescript
const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];
```

### Discriminated unions for state

```typescript
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

### noUncheckedIndexedAccess pattern

```typescript
const items: string[] = ['a', 'b'];
const first = items[0]; // type is string | undefined
if (first !== undefined) {
  console.log(first.toUpperCase()); // safe
}
```

### Import defer (TS 5.9)

```typescript
import * as heavyLib from './heavy-library';
// heavyLib is not evaluated until first property access
const result = heavyLib.compute(data);
```
