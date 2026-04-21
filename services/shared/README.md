# @services/shared

Shared infrastructure library providing cross-cutting concerns for all backend services: database access, structured logging, distributed tracing, CORS handling, error normalization, and route matching.

## Bounded Context

The **Shared** package is not a bounded context in the DDD sense -- it is a **shared kernel** that provides infrastructure services and utilities consumed by all domain services (`expenses`, `documents`, `currencies`, `users`). It has no API endpoints and no Lambda handler entry point. It is imported as a workspace dependency (`workspace:*`) by every service package.

## Provided Modules

### PostgresDatabaseService

Dual-pool PostgreSQL client with automatic SSL detection and X-Ray tracing.

- **Write pool** (`DATABASE_URL`): 3 max connections, used for INSERT/UPDATE/DELETE operations.
- **Read pool** (`DATABASE_READONLY_URL`): 3 max connections, used for SELECT queries against a read replica.
- **SSL auto-detect**: Enables SSL with `rejectUnauthorized: false` when the connection string targets Supabase pooler (`pooler.supabase.com`) or AWS (`amazonaws.com`).
- **X-Ray tracing**: Every query is wrapped in a traced subsegment (`DB:query:write` or `DB:query:read`) via `@aws-lambda-powertools/tracer` decorators.
- **Connection reuse**: Pools are lazily initialized and persisted across warm Lambda invocations.

```typescript
abstract class DatabaseService {
  abstract query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  abstract queryReadOnly<T>(sql: string, params?: unknown[]): Promise<T[]>;
  abstract end(): Promise<void>;
}
```

### LoggerServiceImplementation

Structured JSON logger built on AWS Lambda Powertools.

- Wraps `@aws-lambda-powertools/logger` with `info`, `error`, and `warn` methods.
- Service name defaults to `PROJECT_PREFIX` environment variable or `"app"`.

```typescript
abstract class LoggerService {
  abstract info(item: LogItemMessage, ...extraInput: LogItemExtraInput): void;
  abstract error(item: LogItemMessage, ...extraInput: LogItemExtraInput): void;
  abstract warn(item: LogItemMessage, ...extraInput: LogItemExtraInput): void;
}
```

### TracerServiceImplementation

AWS X-Ray tracing wrapper using Lambda Powertools.

- Annotates cold starts, HTTP methods, resources, and user IDs.
- Provides a `trace<T>(name, fn)` method for wrapping arbitrary async operations in named subsegments.
- Designed as a singleton per service -- instantiated at module scope outside the handler.

### matchRoute

Dynamic route matching utility used by all service routers.

- Matches static segments exactly and dynamic `{param}` segments against any non-empty value.
- Returns `true`/`false` for a given pattern + pathname pair.

```typescript
matchRoute('/expenses/{id}', '/expenses/abc123'); // true
matchRoute('/expenses/{id}', '/expenses/'); // false
matchRoute('/expenses', '/expenses/extra'); // false
```

### ErrorHandler

Centralized error-to-HTTP-response mapper.

- Maps `ModuleError` subclasses to their declared HTTP status codes and messages.
- Falls back to `500 Internal Server Error` for generic `Error` instances and unknown error types.

### addCors

CORS header injection utility.

- Reads allowed origins from `ALLOWED_ORIGINS` (comma-separated).
- Validates the request `Origin` header against the allowed list.
- Sets `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, and `Access-Control-Allow-Methods` headers on every response.

### Interfaces

- **`APIGatewayProxyEvent`** -- Local type definition for Lambda Proxy Integration request format (v1.0), avoiding a direct dependency on `@types/aws-lambda`.
- **`APIGatewayProxyResult`** -- Local type definition for Lambda Proxy Integration response format.

### Test Utilities

- **`test/setup.ts`** -- Shared test setup configuration.
- **`test/factories/factory.ts`** -- Base factory for generating test data.
- **`test/factories/user.factory.ts`** -- User profile factory for test scenarios.
- **`test/fixtures/fixture.base.ts`** -- Base fixture class for integration test data seeding.
- **`test/fixtures/users.fixture.ts`** -- User fixture data for integration tests.

## Dependencies

### Internal Packages

| Package                | Usage                                                      |
| ---------------------- | ---------------------------------------------------------- |
| `@packages/models`     | Error classes (`ModuleError`, `DatabaseError`), HTTP codes |
| `@packages/config`     | Shared ESLint, TypeScript, and Jest configurations (dev)   |
| `@packages/migrations` | Database migration definitions (dev only)                  |

### External Dependencies

| Package                         | Usage                                  |
| ------------------------------- | -------------------------------------- |
| `pg`                            | PostgreSQL client (connection pooling) |
| `@aws-lambda-powertools/logger` | Structured JSON logging                |
| `@aws-lambda-powertools/tracer` | AWS X-Ray distributed tracing          |

## Environment Variables

| Variable                | Required | Description                                                         |
| ----------------------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string (write pool)                           |
| `DATABASE_READONLY_URL` | Yes      | PostgreSQL connection string (read replica pool)                    |
| `ALLOWED_ORIGINS`       | Yes      | Comma-separated list of allowed CORS origins                        |
| `ALLOWED_METHODS`       | No       | Comma-separated list of allowed HTTP methods (recommended for CORS) |
| `PROJECT_PREFIX`        | No       | Service name prefix for logger (default: `app`)                     |

## Scripts

| Script      | Command          | Description              |
| ----------- | ---------------- | ------------------------ |
| `typecheck` | `tsc --noEmit`   | TypeScript type checking |
| `lint`      | `eslint .`       | Run ESLint               |
| `lint:fix`  | `eslint . --fix` | Run ESLint with auto-fix |
| `test`      | `jest`           | Run unit tests           |

## Testing

### Running Tests

```bash
# Unit tests
pnpm test

# Type checking
pnpm typecheck
```

### Test Structure

- **Unit tests** are co-located with source files using the `*.test.ts` suffix (e.g. `DatabaseServiceImp.test.ts`, `LoggerServiceImp.test.ts`, `cors.test.ts`, `error-handler.test.ts`, `router.test.ts`).
- **Test utilities** in `src/test/` provide factories and fixtures shared across all service integration tests.

## Directory Structure

```
services/shared/
├── eslint.config.ts
├── jest.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── domain/
    │   ├── interfaces/
    │   │   ├── request.ts                # APIGatewayProxyEvent type definitions
    │   │   └── response.ts               # APIGatewayProxyResult type definitions
    │   ├── services/
    │   │   ├── database.ts               # Abstract DatabaseService
    │   │   └── logger.ts                 # Abstract LoggerService
    │   └── utils/
    │       ├── cors.ts                   # addCors utility
    │       ├── cors.test.ts
    │       ├── error-handler.ts          # ErrorHandler class
    │       └── error-handler.test.ts
    ├── infrastructure/
    │   └── services/
    │       ├── DatabaseServiceImp.ts      # PostgresDatabaseService (write + read pools)
    │       ├── DatabaseServiceImp.test.ts
    │       ├── LoggerServiceImp.ts        # LoggerServiceImplementation (Powertools)
    │       ├── LoggerServiceImp.test.ts
    │       └── TracerServiceImp.ts        # TracerServiceImplementation (X-Ray)
    ├── test/
    │   ├── setup.ts                      # Shared test setup
    │   ├── factories/
    │   │   ├── factory.ts                # Base factory
    │   │   └── user.factory.ts           # User profile factory
    │   └── fixtures/
    │       ├── fixture.base.ts           # Base fixture class
    │       └── users.fixture.ts          # User seed data
    └── utils/
        ├── router.ts                     # matchRoute utility
        └── router.test.ts
```
