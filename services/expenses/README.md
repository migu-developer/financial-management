# @services/expenses

Expense tracking service providing full CRUD operations with cursor-based pagination, dynamic filtering, and user-scoped data isolation.

## Bounded Context

The **Expenses** bounded context owns all expense lifecycle management: creation, retrieval (list + detail), full and partial updates, and deletion. It also serves the reference catalogs for expense types and categories. Every operation is scoped to the authenticated user via Cognito authorizer claims, ensuring strict tenant isolation at the repository level.

## API Endpoints

| Method   | Path                   | Description                                               | Auth               |
| -------- | ---------------------- | --------------------------------------------------------- | ------------------ |
| `GET`    | `/expenses`            | List expenses with cursor pagination and optional filters | Cognito Authorizer |
| `POST`   | `/expenses`            | Create a new expense                                      | Cognito Authorizer |
| `GET`    | `/expenses/{id}`       | Retrieve a single expense by ID                           | Cognito Authorizer |
| `PUT`    | `/expenses/{id}`       | Full update of an expense                                 | Cognito Authorizer |
| `PATCH`  | `/expenses/{id}`       | Partial update of an expense                              | Cognito Authorizer |
| `DELETE` | `/expenses/{id}`       | Delete an expense                                         | Cognito Authorizer |
| `GET`    | `/expenses/types`      | List all expense types (catalog)                          | Cognito Authorizer |
| `GET`    | `/expenses/categories` | List all expense categories (catalog)                     | Cognito Authorizer |

### Query Parameters (GET /expenses)

| Parameter             | Type   | Description                            |
| --------------------- | ------ | -------------------------------------- |
| `limit`               | number | Page size (required for pagination)    |
| `cursor`              | string | Opaque cursor for next page            |
| `expense_type_id`     | string | Filter by expense type                 |
| `expense_category_id` | string | Filter by expense category             |
| `name`                | string | Case-insensitive partial match (ILIKE) |

## Architecture

The service follows a layered Domain-Driven Design architecture with mixin-based controller composition.

### Presentation Layer

- **`index.ts`** -- Lambda handler entry point. Initializes database, tracer, and logger services at module scope for connection reuse across warm invocations.
- **`presentation/application.ts`** -- Composes the Application context from the API Gateway event, user profile, logger, and database service. Defines route-to-module mappings.
- **`presentation/controller.ts`** -- Mixin-based controller built from `GetWrapper`, `PostWrapper`, `PutWrapper`, `PatchWrapper`, `DeleteWrapper`. Each mixin handles a single HTTP method.
- **`presentation/router.ts`** -- Presentation-level router that resolves modules from the Application's route table.
- **`presentation/service.ts`** -- Service composition layer that wires use cases to repositories.
- **`router.ts`** -- Top-level router using `matchRoute` from `@services/shared` to match dynamic path segments (e.g. `{id}`) and dispatch to the resolved controller method.

### Application Layer

- **`create-expense.use-case.ts`** -- Creates an expense scoped to the authenticated user's UID.
- **`get-expenses-by-user.use-case.ts`** -- Retrieves paginated expenses with cursor-based navigation and dynamic filters (type, category, name ILIKE).
- **`get-expense-by-id.use-case.ts`** -- Fetches a single expense by ID, validated against the user's UID.
- **`update-expense.use-case.ts`** -- Full replacement update of an expense.
- **`patch-expense.use-case.ts`** -- Partial update; only provided fields are modified.
- **`delete-expense.use-case.ts`** -- Deletes an expense, verified against user ownership.
- **`get-expense-types.use-case.ts`** -- Returns all expense types from the catalog.
- **`get-expense-categories.use-case.ts`** -- Returns all expense categories from the catalog.

### Domain Layer

- **`expense.repository.ts`** -- Interface defining the expense repository contract (findAll, findById, create, update, patch, delete, count).
- **`expense-category.repository.ts`** -- Interface for the category catalog repository.
- **`expense-type.repository.ts`** -- Interface for the type catalog repository.

### Infrastructure Layer

- **`postgres-expense.repository.ts`** -- PostgreSQL implementation with X-Ray traced subsegments on every query. Uses write pool for mutations and read-replica pool for reads. Builds dynamic WHERE clauses for filters and cursor-based keyset pagination.
- **`postgres-expense-type.repository.ts`** -- PostgreSQL implementation for expense type catalog lookups.
- **`postgres-expense-category.repository.ts`** -- PostgreSQL implementation for expense category catalog lookups.

## Domain Entities

### Expense

| Field                 | Type     | Description                      |
| --------------------- | -------- | -------------------------------- |
| `id`                  | `string` | UUID primary key                 |
| `user_id`             | `string` | FK to users table                |
| `name`                | `string` | Expense description              |
| `value`               | `number` | Monetary amount                  |
| `currency_id`         | `string` | FK to currencies catalog         |
| `expense_type_id`     | `string` | FK to expense types catalog      |
| `expense_category_id` | `string` | FK to expense categories catalog |
| `created_at`          | `string` | ISO timestamp                    |
| `updated_at`          | `string` | ISO timestamp                    |
| `created_by`          | `string` | Audit: creator identifier        |
| `modified_by`         | `string` | Audit: last modifier identifier  |

### ExpenseType

| Field  | Type     | Description      |
| ------ | -------- | ---------------- |
| `id`   | `string` | UUID primary key |
| `name` | `string` | Type name        |

### ExpenseCategory

| Field  | Type     | Description      |
| ------ | -------- | ---------------- |
| `id`   | `string` | UUID primary key |
| `name` | `string` | Category name    |

## Dependencies

### Internal Packages

| Package            | Usage                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `@services/shared` | `PostgresDatabaseService`, `LoggerServiceImplementation`, `TracerServiceImplementation`, `matchRoute`, `ErrorHandler`, `addCors` |
| `@packages/models` | Expense types/schemas, pagination utilities, error classes, HTTP codes, user profile utilities                                   |
| `@packages/config` | Shared ESLint, TypeScript, and Jest configurations (dev only)                                                                    |

### External Services

| Service                        | Usage                                                       |
| ------------------------------ | ----------------------------------------------------------- |
| Amazon RDS (PostgreSQL)        | Primary data store (write pool) and read replica            |
| Amazon Cognito                 | JWT authorizer providing user identity claims               |
| AWS X-Ray                      | Distributed tracing via `@aws-lambda-powertools/tracer`     |
| AWS Lambda Powertools (Logger) | Structured JSON logging via `@aws-lambda-powertools/logger` |

## Environment Variables

| Variable                | Required | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string (write pool)        |
| `DATABASE_READONLY_URL` | Yes      | PostgreSQL connection string (read replica pool) |
| `ALLOWED_ORIGINS`       | Yes      | Comma-separated list of allowed CORS origins     |
| `ALLOWED_METHODS`       | Yes      | Comma-separated list of allowed HTTP methods     |
| `PROJECT_PREFIX`        | No       | Service name prefix for logger (default: `app`)  |

## Scripts

| Script             | Command                                             | Description                        |
| ------------------ | --------------------------------------------------- | ---------------------------------- |
| `typecheck`        | `tsc --noEmit`                                      | TypeScript type checking           |
| `lint`             | `eslint .`                                          | Run ESLint                         |
| `lint:fix`         | `eslint . --fix`                                    | Run ESLint with auto-fix           |
| `test`             | `jest`                                              | Run unit tests                     |
| `test:integration` | `jest --config src/test/jest.config.ts --runInBand` | Run integration tests sequentially |
| `execute`          | `for f in src/exec/*.ts; do tsx "$f"; done`         | Execute all exec scripts           |
| `run:file`         | `tsx`                                               | Run a single TypeScript file       |

## Testing

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests (requires DATABASE_URL and DATABASE_READONLY_URL)
pnpm test:integration

# Type checking
pnpm typecheck
```

### Test Structure

- **Unit tests** are co-located with source files using the `*.test.ts` suffix (e.g. `router.test.ts`, `presentation/controller.test.ts`, `types/module.test.ts`).
- **Integration tests** live in `src/test/` and run against a real PostgreSQL database with `--runInBand` to avoid connection pool contention.
- **Factories** in `src/test/factories/` provide builders for test data (e.g. `expense.factory.ts`).
- **Fixtures** in `src/test/fixtures/` provide static seed data for integration tests (e.g. `expenses.fixture.ts`, `catalogs.fixture.ts`).

## Directory Structure

```
services/expenses/
├── eslint.config.ts
├── jest.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # Lambda handler entry point
    ├── router.ts                         # Top-level route matching + dispatch
    ├── router.test.ts
    ├── application/
    │   └── use-cases/
    │       ├── create-expense.use-case.ts
    │       ├── delete-expense.use-case.ts
    │       ├── get-expense-by-id.use-case.ts
    │       ├── get-expense-categories.use-case.ts
    │       ├── get-expense-types.use-case.ts
    │       ├── get-expenses-by-user.use-case.ts
    │       ├── patch-expense.use-case.ts
    │       └── update-expense.use-case.ts
    ├── domain/
    │   └── repositories/
    │       ├── expense.repository.ts
    │       ├── expense-category.repository.ts
    │       └── expense-type.repository.ts
    ├── exec/
    │   ├── create-expense.ts
    │   ├── delete-expense.ts
    │   ├── get-expense-by-id.ts
    │   ├── get-expense-categories.ts
    │   ├── get-expense-types.ts
    │   ├── get-expenses.ts
    │   ├── patch-expense.ts
    │   └── put-expense.ts
    ├── infrastructure/
    │   └── repositories/
    │       ├── postgres-expense.repository.ts
    │       ├── postgres-expense-category.repository.ts
    │       └── postgres-expense-type.repository.ts
    ├── presentation/
    │   ├── application.ts
    │   ├── application.test.ts
    │   ├── controller.ts
    │   ├── controller.test.ts
    │   ├── router.ts
    │   ├── router.test.ts
    │   ├── service.ts
    │   └── service.test.ts
    ├── test/
    │   ├── jest.config.ts
    │   ├── expenses.integration.test.ts
    │   ├── expense-types.integration.test.ts
    │   ├── expense-categories.integration.test.ts
    │   ├── factories/
    │   │   └── expense.factory.ts
    │   └── fixtures/
    │       ├── catalogs.fixture.ts
    │       └── expenses.fixture.ts
    └── types/
        ├── index.ts
        ├── controller.ts
        ├── controller.test.ts
        ├── module.ts
        ├── module.test.ts
        ├── service.ts
        └── service.test.ts
```
