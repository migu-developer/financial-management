# @services/documents

Read-only catalog service that provides the list of document types used for user identity verification.

## Bounded Context

The **Documents** bounded context owns the reference catalog of document types (e.g. passport, national ID, driver's license). It is a read-only service: no mutations are exposed through the API. Document records are managed externally via database migrations. Other services (notably `@services/users`) reference document IDs as foreign keys.

## API Endpoints

| Method | Path         | Description                                    | Auth               |
| ------ | ------------ | ---------------------------------------------- | ------------------ |
| `GET`  | `/documents` | List all document types, sorted alphabetically | Cognito Authorizer |

## Architecture

The service follows the same layered Domain-Driven Design architecture as all other services in the monorepo, with a minimal footprint given its read-only nature.

### Presentation Layer

- **`handlers/get-documents.ts`** -- Lambda handler. Initializes database, tracer, and logger services at module scope for warm invocation reuse.
- **`presentation/application.ts`** -- Composes the Application context from the API Gateway event, user profile, logger, and database service. Defines the single route-to-module mapping.
- **`presentation/controller.ts`** -- Controller handling the GET method for the `/documents` route.
- **`presentation/router.ts`** -- Presentation-level router resolving modules from the Application's route table.
- **`presentation/service.ts`** -- Service composition layer wiring the use case to the repository.
- **`router.ts`** -- Top-level router using `matchRoute` from `@services/shared` to resolve the request path and dispatch to the controller.

### Application Layer

- **`get-documents.use-case.ts`** -- Single use case that retrieves all document types from the repository.

### Domain Layer

- **`document.entity.ts`** -- Defines the `DocumentEntity` interface.
- **`document.repository.ts`** -- Interface defining the document repository contract (`findAll`).

### Infrastructure Layer

- **`postgres-document.repository.ts`** -- PostgreSQL implementation with X-Ray traced subsegments. Uses the read-replica pool since this is a read-only service.

## Domain Entities

### DocumentEntity

| Field  | Type     | Description                                 |
| ------ | -------- | ------------------------------------------- |
| `id`   | `string` | UUID primary key                            |
| `name` | `string` | Document type name (e.g. "Passport", "DNI") |

## Dependencies

### Internal Packages

| Package            | Usage                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `@services/shared` | `PostgresDatabaseService`, `LoggerServiceImplementation`, `TracerServiceImplementation`, `matchRoute`, `ErrorHandler`, `addCors` |
| `@packages/models` | Shared types, error classes, HTTP codes, user profile utilities                                                                  |
| `@packages/config` | Shared ESLint, TypeScript, and Jest configurations (dev only)                                                                    |

### External Services

| Service                        | Usage                                                       |
| ------------------------------ | ----------------------------------------------------------- |
| Amazon RDS (PostgreSQL)        | Primary data store (read replica for queries)               |
| Amazon Cognito                 | JWT authorizer providing user identity claims               |
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
- **Fixtures** in `src/test/fixtures/` provide static seed data for integration tests (e.g. `catalogs.fixture.ts`).

## Directory Structure

```
services/documents/
├── eslint.config.ts
├── jest.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── handlers/
    │   └── get-documents.ts              # Lambda handler (CDK entry point)
    ├── exec/                             # Local test scripts
    │   └── get-documents.ts
    ├── router.ts                         # Top-level route matching + dispatch
    ├── router.test.ts
    ├── application/
    │   └── use-cases/
    │       └── get-documents.use-case.ts
    ├── domain/
    │   ├── entities/
    │   │   └── document.entity.ts
    │   └── repositories/
    │       └── document.repository.ts
    ├── infrastructure/
    │   └── repositories/
    │       └── postgres-document.repository.ts
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
    │   ├── documents.integration.test.ts
    │   └── fixtures/
    │       └── catalogs.fixture.ts
    └── types/
        ├── index.ts
        ├── controller.ts
        ├── controller.test.ts
        ├── module.ts
        ├── module.test.ts
        ├── service.ts
        └── service.test.ts
```
