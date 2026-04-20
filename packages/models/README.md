# @packages/models

Shared domain types, JSON validation schemas, error classes, and pagination utilities for the financial management project. This package is the canonical source of data shapes consumed by Lambda services, the client app, and Cognito triggers.

## Responsibility

Defines the data contracts (TypeScript interfaces and JSON schemas) that all other packages in the monorepo use when creating, reading, or validating domain entities. Also provides structured error classes and cursor-based pagination helpers.

## Exports

### Root (`@packages/models`)

```typescript
// UUID utilities
export { UUID_PATTERN, uuidField, UUID_REGEX } from './shared';

// Expense JSON schemas
export { createExpenseSchema, patchExpenseSchema } from './expenses';

// Expense types
export type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  PatchExpenseInput,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from './expenses';
```

### Subpath exports (used by other packages via deep imports)

| Import Path                               | What It Provides                                   |
| ----------------------------------------- | -------------------------------------------------- |
| `@packages/models/shared`                 | UUID fields, pagination utilities                  |
| `@packages/models/shared/fields`          | `UUID_PATTERN`, `uuidField`, `UUID_REGEX`          |
| `@packages/models/shared/utils/errors`    | All error classes and error codes                  |
| `@packages/models/shared/utils/http-code` | `HttpCode` enum                                    |
| `@packages/models/expenses`               | Expense schemas, types, filters                    |
| `@packages/models/users/types`            | `UserProfile`, `CreateUserInput`, `PatchUserInput` |
| `@packages/models/users/schema`           | `createUserSchema`, `patchUserSchema`              |
| `@packages/models/users/utils`            | `getUserProfile()`                                 |

## Domain Models

### User (`UserProfile`)

| Field                        | Type             | Description               |
| ---------------------------- | ---------------- | ------------------------- |
| `id`                         | `string`         | Internal UUID             |
| `uid`                        | `string`         | Cognito `sub`             |
| `email`                      | `string`         | User email                |
| `first_name`                 | `string \| null` | Given name                |
| `last_name`                  | `string \| null` | Family name               |
| `identities`                 | `string \| null` | Linked identity providers |
| `locale`                     | `string \| null` | User locale               |
| `picture`                    | `string \| null` | Profile picture URL       |
| `phone`                      | `string \| null` | Phone number              |
| `document_id`                | `string \| null` | FK to documents table     |
| `email_verified`             | `boolean`        | Email verification status |
| `phone_verified`             | `boolean`        | Phone verification status |
| `provider_id`                | `string \| null` | FK to providers table     |
| `created_at` / `updated_at`  | `string`         | Timestamps                |
| `created_by` / `modified_by` | `string \| null` | Audit fields              |

Input types: `CreateUserInput` (required: `uid`, `email`), `PatchUserInput` (all optional).

### Expense

| Field                        | Type             | Description                           |
| ---------------------------- | ---------------- | ------------------------------------- |
| `id`                         | `string`         | UUID                                  |
| `user_id`                    | `string`         | FK to users                           |
| `name`                       | `string`         | Expense description                   |
| `value`                      | `number`         | Amount (positive, exclusive of zero)  |
| `currency_id`                | `string`         | FK to currencies                      |
| `expense_type_id`            | `string`         | FK to expenses_types (income/outcome) |
| `expense_category_id`        | `string \| null` | FK to expenses_categories             |
| `created_at` / `updated_at`  | `string`         | Timestamps                            |
| `created_by` / `modified_by` | `string \| null` | Audit fields                          |

Input types: `CreateExpenseInput` (required: `name`, `value`, `currency_id`, `expense_type_id`), `PatchExpenseInput` (all optional, min 1 property).

### Catalog Types

- **`Currency`** -- `id`, `code` (3-char ISO), `name`, `symbol`, `country`
- **`ExpenseType`** -- `id`, `name` (`'income'` | `'outcome'`), `description`
- **`ExpenseCategory`** -- `id`, `name`, `description`

## JSON Validation Schemas

All schemas use JSON Schema draft-04 format with `additionalProperties: false`:

| Schema                | Required Fields                                   | Notes                       |
| --------------------- | ------------------------------------------------- | --------------------------- |
| `createExpenseSchema` | `name`, `value`, `currency_id`, `expense_type_id` | `value` must be > 0         |
| `patchExpenseSchema`  | -- (at least 1 property)                          | Partial update              |
| `createUserSchema`    | `uid`, `email`                                    | Email format validated      |
| `patchUserSchema`     | -- (at least 1 property)                          | Phone pattern: `^\+[0-9]+$` |

### Expense Filters

```typescript
interface ExpenseFilters {
  expense_type_id?: string;
  expense_category_id?: string;
  name?: string;
}

parseExpenseFilters(queryString): ExpenseFilters
```

## Error Classes

All error classes extend the abstract `ModuleError` base class, which provides `params`, `code`, `getMessage()`, and `getCode()`.

| Class                        | HTTP Code  | Message                                    |
| ---------------------------- | ---------- | ------------------------------------------ |
| `ModuleError`                | (abstract) | Base class with params + code              |
| `ModuleNotFoundError`        | 404        | "Module not found"                         |
| `MethodNotImplementedError`  | 501        | "Method not implemented"                   |
| `RouteNotFoundError`         | 404        | "Route not found"                          |
| `ServiceNotImplementedError` | 501        | "Service not implemented"                  |
| `DataNotDefinedError`        | 500        | Custom message                             |
| `UnauthorizedError`          | 401        | "Unauthorized"                             |
| `DatabaseError`              | 500        | Custom message (default: "Database Error") |
| `ResultBodyUndefinedError`   | 500        | "Result body is undefined"                 |

### Error Codes (`ErrorCode` enum)

- `BAD_REQUEST_BODY`
- `BAD_REQUEST_PARAMETERS`
- `UNAUTHORIZED`
- `ACCESS_DENIED`

### HTTP Codes (`HttpCode` enum)

`BAD_REQUEST (400)`, `UNAUTHORIZED (401)`, `FORBIDDEN (403)`, `NOT_FOUND (404)`, `METHOD_NOT_ALLOWED (405)`, `INTERNAL_SERVER_ERROR (500)`, `SUCCESS (200)`, `NOT_IMPLEMENTED (501)`

### API Gateway Error Schema

The `errorsSchema` array in `expenses/error.schema.ts` maps error codes to API Gateway response templates for `BadRequestBody`, `BadRequestParams`, `Unauthorized`, and `AccessDenied`.

## Pagination Utilities

Cursor-based pagination using base64url-encoded `created_at|id` cursors.

```typescript
// Parse query params into pagination params (default limit: 20, max: 100)
parsePaginationParams(queryLimit?, queryCursor?): PaginationParams

// Encode a cursor from a row
encodeCursor(createdAt, id): string

// Decode a cursor back to created_at + id
decodeCursor(cursor): { created_at: string; id: string }

// Build a paginated result from rows (expects limit+1 rows to detect has_more)
buildPaginatedResult<T>(rows, limit): PaginatedResult<T>
```

### Types

```typescript
interface PaginationParams {
  limit: number;
  cursor?: string;
}

interface PaginatedResult<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
  total_count?: number;
}
```

## Structure

```
packages/models/
  src/
    index.ts                             # Root re-exports
    expenses/
      index.ts                           # Expense barrel exports
      types.ts                           # Expense, Currency, ExpenseType, ExpenseCategory
      schema.ts                          # createExpenseSchema, patchExpenseSchema
      filters.ts                         # ExpenseFilters, parseExpenseFilters()
      error.schema.ts                    # API Gateway error response mappings
    users/
      types.ts                           # UserProfile, CreateUserInput, PatchUserInput
      schema.ts                          # createUserSchema, patchUserSchema
      utils.ts                           # getUserProfile() helper
    shared/
      index.ts                           # Shared barrel exports
      fields/
        index.ts                         # Re-exports from uuid.ts
        uuid.ts                          # UUID_PATTERN, uuidField, UUID_REGEX
      pagination.ts                      # Cursor-based pagination utilities
      utils/
        http-code.ts                     # HttpCode enum
        errors/
          index.ts                       # Error barrel exports
          codes.ts                       # ErrorCode enum
          modules.ts                     # ModuleError, ModuleNotFoundError
          methods.ts                     # MethodNotImplementedError, RouteNotFoundError
          services.ts                    # ServiceNotImplementedError, DataNotDefinedError, UnauthorizedError
          database.ts                    # DatabaseError
          result.ts                      # ResultBodyUndefinedError
  package.json
  tsconfig.json
  jest.config.ts
```

## Dependencies

### Internal (workspace)

- `@packages/config` -- ESLint configuration (devDependency)

### External

None. This package has zero runtime dependencies -- it only defines types, schemas, and pure utility functions.

## Scripts

| Script      | Command          | Description              |
| ----------- | ---------------- | ------------------------ |
| `typecheck` | `tsc --noEmit`   | TypeScript type checking |
| `lint`      | `eslint .`       | Run ESLint               |
| `lint:fix`  | `eslint . --fix` | Auto-fix ESLint issues   |
| `test`      | `jest`           | Run unit tests           |

## Testing

```bash
pnpm test
```

Tests are colocated with source files (`*.test.ts`). Every schema, error class, pagination function, and utility has its own test file. No external dependencies need to be mocked.
