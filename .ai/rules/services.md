# Services Rules -- Backend Microservices

## Scope

Applies to everything under `services/` (currencies, documents, expenses,
users, shared).

## DDD Layers

Each service follows a strict four-layer architecture:

```
services/<name>/src/
  domain/
    entities/         # Optional: only for read-only catalogs (documents, currencies)
    repositories/     # Repository interfaces (ports)
    services/         # Domain service interfaces (e.g., CurrencyConversionService)
  application/
    use-cases/        # Single-responsibility use cases
  presentation/
    application.ts    # Request context (logger, db, event, headers)
    controller.ts     # HTTP method routing (extends Controller mixin)
    service.ts        # Orchestrates use cases, returns Response
    router.ts         # Module registration
  infrastructure/
    repositories/     # PostgreSQL repository implementations
    services/         # Infrastructure service implementations
  handlers/           # Lambda entry points for non-API-Gateway triggers (EventBridge, etc.)
  exec/               # Local test scripts ONLY (run with `pnpm execute` or `pnpm run:file`)
  types/
    controller.ts     # Base Controller with mixin composition
    service.ts        # Base Service with mixin composition
    module.ts         # ModuleType interface
```

### Entry Points

- `src/handlers/*.ts` -- Lambda handlers. CDK stacks point `entry:` to these files.
  For API Gateway handlers, `src/index.ts` may re-export for backwards compatibility.
- `src/exec/*.ts` -- **Local test scripts ONLY**. These import handlers and invoke
  them with mock payloads for local testing via `pnpm execute` or `pnpm run:file`.
  NEVER point CDK `entry:` to `exec/` files. NEVER put business logic in `exec/`.

### Handler Typing

- NEVER type Lambda handler event parameters as `unknown`.
- Use the correct event interface from `@services/shared/domain/interfaces/`:
  - API Gateway: `APIGatewayProxyEvent` from `request.ts`
  - EventBridge / Scheduler: `ScheduledEvent` from `eventbridge.ts`
  - SQS: `SQSEvent` (add to shared when needed)
- Local test scripts in `exec/` MUST also use the typed event interface.

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

### Tracing (X-Ray)

Two patterns, applied consistently across all services:

- **Handler level** (`handlers/*.ts`): Use `TracerServiceImplementation` from
  `@services/shared` for `annotateColdStart()`, `putAnnotation()`, and
  `captureAWSv3Client()`. Create at module scope (outside handler).
- **Method level** (repos/services): Use `@trace('SegmentName')` Stage 3 decorator
  from `@services/shared/infrastructure/decorators/trace`. Creates X-Ray subsegments.
- NEVER use `@tracer.captureMethod()` from Powertools (legacy decorator).
- NEVER use `new Tracer()` directly -- use `TracerServiceImplementation` or `@trace`.
- NEVER enable `experimentalDecorators` in tsconfig.

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

## Testing Requirements

- **Unit tests**: Every use case MUST have a unit test (`*.use-case.test.ts`)
  co-located next to the source file. Mock the repository.
- **Integration tests**: Every repository method MUST have an integration test
  in `src/test/*.integration.test.ts` that hits a real database.
- **Lambda test scripts**: Every new Lambda handler MUST have a corresponding
  test script in `src/exec/` that imports the handler and invokes it with a
  mock payload. Run via `pnpm execute` or `pnpm run:file src/exec/<name>.ts`.
- Use `TestDatabaseService` with schema isolation for integration tests.
- Fixtures go in `src/test/fixtures/`, factories in `src/test/factories/`.

## Constraints

- NEVER import from `presentation/` inside `domain/`.
- NEVER put business logic in controllers -- delegate to services/use cases.
- NEVER use `any` type. Define proper interfaces.
- NEVER access `process.env` outside of `handlers/`, `exec/`, or `application.ts`.
- NEVER put Lambda handler code in `exec/` -- handlers go in `handlers/` or
  `index.ts`. The `exec/` directory is for local test scripts ONLY.
- NEVER point CDK `entry:` to files in `exec/`.
- Shared utilities go in `services/shared`, not duplicated per service.
- NEVER use relative paths (`../../`) -- use path aliases (`@services/<name>`).
