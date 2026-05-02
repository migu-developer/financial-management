# Services Agent Instructions

## Scope

Backend Lambda microservices under `services/`:
`currencies`, `documents`, `expenses`, `users`, `shared`.

## Commands

```bash
pnpm --filter @services/<name> build      # Build one service
pnpm --filter @services/<name> test       # Unit tests
pnpm test:integration                     # Integration tests (needs DB)
pnpm --filter @services/<name> lint       # Lint one service
pnpm --filter @services/<name> typecheck  # Type-check one service
```

## Patterns

### Required Architecture (DDD)

```
src/
  domain/entities/          # Optional: only for read-only catalogs (documents, currencies)
  domain/repositories/      # Interfaces (ports)
  application/use-cases/    # Single execute() method
  presentation/             # HTTP layer (controller, service, router)
  infrastructure/           # Repository implementations (PostgreSQL)
  exec/                     # Lambda handler entry points
  types/                    # Base classes (Controller, Service, ModuleType)
```

### Controller Pattern

- Extend `Controller` (mixin-composed from HTTP method wrappers).
- Override only the methods you need (GET, POST, PUT, PATCH, DELETE).
- Unimplemented methods throw `MethodNotImplementedError`.

### Service Pattern

- Extend `Service` (mixin-composed from executor wrappers).
- Instantiate repository + use case inside the service method.
- Return `Response` objects with proper HTTP status codes.

### Error Handling

- `ErrorHandler.handle(error, logger)` in Lambda handlers.
- Domain errors use `ModuleError` with appropriate HTTP codes.
- Unknown errors map to `500 Internal Server Error`.

### CORS

- `addCors(result, requestHeaders)` from `services/shared`.
- Origins from `ALLOWED_ORIGINS` env var; methods from `ALLOWED_METHODS`.

## Constraints

- NEVER import from `presentation/` inside `domain/`.
- NEVER put business logic in controllers.
- NEVER use `any` type -- define proper interfaces.
- NEVER access `process.env` outside `exec/` handlers or `application.ts`.
- NEVER duplicate shared utilities -- use `services/shared`.
- NEVER concatenate user input into SQL -- use parameterized queries.

## Dependencies

- `@packages/models` -- shared types, errors, HTTP codes.
- `@packages/config` -- shared ESLint/TypeScript config.
- `pg` -- PostgreSQL client.
- `@aws-lambda-powertools/logger` -- structured logging.
- `@aws-lambda-powertools/tracer` -- X-Ray tracing (used via `TracerServiceImplementation` and `@trace` decorator).

## Tracing

Two patterns, used consistently across all services:

- **Handler level** (`handlers/*.ts`): `TracerServiceImplementation` for cold start
  annotations, `putAnnotation()`, and `captureAWSv3Client()`.
- **Method level** (repos/services): `@trace('SegmentName')` Stage 3 decorator from
  `@services/shared/infrastructure/decorators/trace` for X-Ray subsegments.
- NEVER use `@tracer.captureMethod()` or `new Tracer()` directly.
- NEVER enable `experimentalDecorators` in tsconfig.
