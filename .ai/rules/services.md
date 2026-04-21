# Services Rules -- Backend Microservices

## Scope

Applies to everything under `services/` (currencies, documents, expenses,
users, shared).

## DDD Layers

Each service follows a strict four-layer architecture:

```
services/<name>/src/
  domain/
    entities/         # Pure domain models (no framework deps)
    repositories/     # Repository interfaces (ports)
  application/
    use-cases/        # Single-responsibility use cases
  presentation/
    application.ts    # Request context (logger, db, event, headers)
    controller.ts     # HTTP method routing (extends Controller mixin)
    service.ts        # Orchestrates use cases, returns Response
    router.ts         # Module registration
  infrastructure/
    repositories/     # PostgreSQL repository implementations
  exec/               # Lambda handler entry points
  types/
    controller.ts     # Base Controller with mixin composition
    service.ts        # Base Service with mixin composition
    module.ts         # ModuleType interface
```

## Patterns

### Use Case Pattern

Each use case has a single `execute()` method. Inject the repository via
constructor. Never call the database directly from controllers or services.

```typescript
export class GetCurrenciesUseCase {
  constructor(private readonly repository: CurrencyRepository) {}
  async execute(): Promise<Currency[]> {
    return this.repository.findAll();
  }
}
```

### Controller Mixin Composition

Controllers extend a `Controller` class built from mixin wrappers
(`GetWrapper`, `PostWrapper`, `PutWrapper`, `PatchWrapper`, `DeleteWrapper`)
that delegate HTTP methods to the service. Override only the methods you need;
unimplemented methods throw `MethodNotImplementedError`.

### Service Mixin Composition

Services extend a `Service` class built from executor wrappers
(`ExecuteGETWrapper`, `ExecutePOSTWrapper`, etc.). Override to implement
business logic; unimplemented methods throw `ServiceNotImplementedError`.

### Repository Pattern

- Define the repository interface in `domain/repositories/`.
- Implement in `infrastructure/repositories/` using the `DatabaseService`
  abstraction (PostgreSQL via `pg`).
- Use parameterized queries. Never concatenate user input into SQL.

### Error Handling

- Use `ModuleError` (from `@packages/models`) for domain errors with HTTP codes.
- Use `ErrorHandler.handle(error, logger)` in Lambda handlers to produce
  consistent API Gateway responses.
- Wrap unknown errors with `HttpCode.INTERNAL_SERVER_ERROR`.

### CORS Handling

- Use the `addCors()` utility from `services/shared`.
- CORS origins come from `ALLOWED_ORIGINS` environment variable (comma-separated).
- Allowed methods come from `ALLOWED_METHODS` environment variable.

## Environment Variables

| Variable                | Description                          |
| ----------------------- | ------------------------------------ |
| `DATABASE_URL`          | Primary PostgreSQL connection string |
| `DATABASE_READONLY_URL` | Read-replica connection string       |
| `ALLOWED_ORIGINS`       | Comma-separated allowed origins      |
| `ALLOWED_METHODS`       | Comma-separated HTTP methods         |

## Commands

```bash
# Build a specific service
pnpm --filter @services/<name> build

# Test a specific service
pnpm --filter @services/<name> test

# Run integration tests (requires DATABASE_URL)
pnpm test:integration
```

## Constraints

- NEVER import from `presentation/` inside `domain/`.
- NEVER put business logic in controllers -- delegate to services/use cases.
- NEVER use `any` type. Define proper interfaces.
- NEVER access `process.env` outside of `exec/` entry points or `application.ts`.
- Shared utilities go in `services/shared`, not duplicated per service.
