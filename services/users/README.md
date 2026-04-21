# @services/users

User profile management service supporting multi-provider identity, UID-based lookup, and partial updates for account personalization.

## Bounded Context

The **Users** bounded context owns user profile lifecycle management: creation on first authentication, profile retrieval by UID or email, partial profile updates, and UID migration when a user re-authenticates through a different identity provider. It acts as the identity anchor for all other services -- expenses, documents, and currencies all resolve the authenticated user through this context's UID-based lookup. The service supports multi-provider identities (e.g. Google, Apple, email/password) with a single canonical profile per email address.

## API Endpoints

| Method  | Path          | Description                                       | Auth               |
| ------- | ------------- | ------------------------------------------------- | ------------------ |
| `POST`  | `/users`      | Create a new user profile on first authentication | Cognito Authorizer |
| `GET`   | `/users/{id}` | Retrieve a user profile by UID                    | Cognito Authorizer |
| `PATCH` | `/users/{id}` | Partial update of user profile fields             | Cognito Authorizer |

### Internal Use Cases (not exposed as endpoints)

| Use Case         | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `GetUserByEmail` | Look up existing profile by email during provider linking |
| `UpdateUserUid`  | Migrate UID when user re-authenticates via a new provider |

## Architecture

The service follows a layered Domain-Driven Design architecture.

### Presentation Layer

- **`index.ts`** -- Lambda handler entry point. Initializes database, tracer, and logger services at module scope for warm invocation reuse.
- **`presentation/application.ts`** -- Composes the Application context from the API Gateway event, user profile, logger, and database service. Defines route-to-module mappings.
- **`presentation/controller.ts`** -- Controller handling GET, POST, and PATCH methods dispatched by route.
- **`presentation/router.ts`** -- Presentation-level router resolving modules from the Application's route table.
- **`presentation/service.ts`** -- Service composition layer wiring use cases to the repository.
- **`router.ts`** -- Top-level router using `matchRoute` from `@services/shared` to match dynamic path segments (e.g. `{id}`) and dispatch to the resolved controller method.

### Application Layer

- **`create-user.use-case.ts`** -- Creates a new user profile with the fields provided from the identity provider (email, name, locale, picture, phone, identities, provider_id).
- **`get-user-by-uid.use-case.ts`** -- Retrieves a user by their Cognito UID.
- **`get-user-by-email.use-case.ts`** -- Retrieves a user by email address (used internally for provider linking flows).
- **`patch-user.use-case.ts`** -- Partial update of profile fields (first_name, last_name, locale, picture, phone, document_id).
- **`update-user-uid.use-case.ts`** -- Updates the UID for an existing user when they re-authenticate through a different identity provider.

### Domain Layer

- **`user.repository.ts`** -- Interface defining the user repository contract: `findByUid`, `findByEmail`, `create`, `patch`, `updateUid`.

### Infrastructure Layer

- **`postgres-user.repository.ts`** -- PostgreSQL implementation with X-Ray traced subsegments on every query. Uses write pool for mutations and read-replica pool for reads. Dynamically builds SET clauses for create and patch operations to only include provided fields.

## Domain Entities

### UserProfile

| Field            | Type      | Description                                           |
| ---------------- | --------- | ----------------------------------------------------- |
| `id`             | `string`  | UUID primary key (internal)                           |
| `uid`            | `string`  | Cognito user identifier (external-facing)             |
| `email`          | `string`  | User email address (unique)                           |
| `first_name`     | `string`  | First name                                            |
| `last_name`      | `string`  | Last name                                             |
| `identities`     | `string`  | JSON-encoded identity provider data                   |
| `locale`         | `string`  | User locale preference (e.g. "en", "es")              |
| `picture`        | `string`  | Profile picture URL                                   |
| `phone`          | `string`  | Phone number                                          |
| `document_id`    | `string`  | FK to documents catalog                               |
| `email_verified` | `boolean` | Whether the email has been verified                   |
| `phone_verified` | `boolean` | Whether the phone has been verified                   |
| `provider_id`    | `string`  | Identity provider identifier (e.g. "google", "apple") |
| `created_at`     | `string`  | ISO timestamp                                         |
| `updated_at`     | `string`  | ISO timestamp                                         |
| `created_by`     | `string`  | Audit: creator identifier                             |
| `modified_by`    | `string`  | Audit: last modifier identifier                       |

## Dependencies

### Internal Packages

| Package            | Usage                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `@services/shared` | `PostgresDatabaseService`, `LoggerServiceImplementation`, `TracerServiceImplementation`, `matchRoute`, `ErrorHandler`, `addCors` |
| `@packages/models` | User types/schemas (`UserProfile`, `CreateUserInput`, `PatchUserInput`), error classes, HTTP codes, user profile utilities       |
| `@packages/config` | Shared ESLint, TypeScript, and Jest configurations (dev only)                                                                    |

### External Services

| Service                        | Usage                                                       |
| ------------------------------ | ----------------------------------------------------------- |
| Amazon RDS (PostgreSQL)        | Primary data store (write pool) and read replica            |
| Amazon Cognito                 | JWT authorizer providing user identity claims and UID       |
| AWS X-Ray                      | Distributed tracing via `@aws-lambda-powertools/tracer`     |
| AWS Lambda Powertools (Logger) | Structured JSON logging via `@aws-lambda-powertools/logger` |

## Environment Variables

| Variable                | Required | Description                                                         |
| ----------------------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string (write pool)                           |
| `DATABASE_READONLY_URL` | Yes      | PostgreSQL connection string (read replica pool)                    |
| `ALLOWED_ORIGINS`       | Yes      | Comma-separated list of allowed CORS origins                        |
| `ALLOWED_METHODS`       | No       | Comma-separated list of allowed HTTP methods (recommended for CORS) |
| `PROJECT_PREFIX`        | No       | Service name prefix for logger (default: `app`)                     |

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
- **Integration tests** live in `src/test/` and run against a real PostgreSQL database with `--runInBand`.

## Directory Structure

```
services/users/
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
    │       ├── create-user.use-case.ts
    │       ├── get-user-by-email.use-case.ts
    │       ├── get-user-by-uid.use-case.ts
    │       ├── patch-user.use-case.ts
    │       └── update-user-uid.use-case.ts
    ├── domain/
    │   └── repositories/
    │       └── user.repository.ts
    ├── exec/
    │   ├── create-user.ts
    │   ├── get-user.ts
    │   ├── get-user-by-email.ts
    │   ├── patch-user.ts
    │   └── update-user-uid.ts
    ├── infrastructure/
    │   └── repositories/
    │       └── postgres-user.repository.ts
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
    │   └── users.integration.test.ts
    └── types/
        ├── index.ts
        ├── controller.ts
        ├── controller.test.ts
        ├── module.ts
        ├── module.test.ts
        ├── service.ts
        └── service.test.ts
```
