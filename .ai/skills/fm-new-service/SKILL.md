---
name: fm-new-service
description: |
  Step-by-step guide to create a new backend Lambda service following DDD patterns.
  Uses services/expenses/ as the reference implementation.
  TRIGGER when: creating a new backend service, adding a new Lambda, or scaffolding a new API.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Creating a new backend service'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# fm-new-service -- Create a New Backend Service

## Version

1.0

## Reference

Use `services/expenses/` as the canonical reference for structure and patterns.

## Steps

### 1. Create service directory

```bash
mkdir -p services/{name}/src/{application/use-cases,domain/repositories,infrastructure/repositories,presentation}
```

### 2. Create package.json

Copy `services/expenses/package.json`, rename `@services/expenses` to `@services/{name}`.
Key dependencies: `@aws-lambda-powertools/logger`, `@aws-lambda-powertools/tracer`,
`@packages/models`, `@services/shared`. Use `catalog:` for external deps.

### 3. Create tsconfig.json

Extend `@packages/config/tsconfig.base.json`. Set paths:
`@services/{name}/*` -> `./src/*`, `@packages/models/*`, `@services/shared/*`.

### 4. Implement source layers

**Domain layer** (`src/domain/repositories/`):

- Define repository interfaces (ports) for the service entities
- Example: `{entity}.repository.ts` with interface methods

**Infrastructure layer** (`src/infrastructure/repositories/`):

- PostgreSQL implementations of domain repository interfaces
- Example: `postgres-{entity}.repository.ts`

**Application layer** (`src/application/use-cases/`):

- One use-case per file: `create-{entity}.use-case.ts`, `get-{entity}-by-id.use-case.ts`, etc.
- Each use-case receives repository interface via constructor injection

**Presentation layer** (`src/presentation/`):

- `application.ts` -- Initializes routes, modules, logger, user, dbService
- `controller.ts` -- HTTP method handlers (GET, POST, PUT, PATCH, DELETE)
- `service.ts` -- Orchestrates use-cases, instantiates repositories
- `router.ts` -- Maps route patterns to controller factories

**Entry point** (`src/index.ts`):

- Lambda handler function: parses event, creates Application, dispatches via Router
- Uses `@services/shared` for CORS, error handling, logger, tracer, database

**Router** (`src/router.ts`):

- Dispatches requests to the correct controller based on HTTP method and path

### 5. Add to CDK infrastructure

Create `infra/lib/versions/v2/lambda-{name}-stack.ts`:

- Extend `BaseStack`
- Create `NodejsFunction` with `functionName: fm-${stage}-{name}`
- Create `LogGroup` with `/aws/lambda/fm-${stage}-{name}`
- Add API Gateway routes using the `gateway` dependency
- Export function name with `exportForCrossVersion`

Register in `infra/lib/versions/v2/index.ts`:

- Add a `createLambda{Name}Stack` factory
- Add to `v2Stacks` array (after ApiGateway, before ApiDocs)

Add to `infra/lib/versions/v2/stacks.ts`:

- Add `LAMBDA_{NAME}` to the `ActiveStack` enum

### 6. Add to monitoring (v3)

In `infra/lib/versions/v3/monitoring-stack.ts`:

- Add the new function to `lambdaFunctions` record via `importFromVersion`
- Alarms are created automatically for all entries in `lambdaFunctions`

### 7. Add workspace dependency to infra

In `infra/package.json`, add:

```json
"@services/{name}": "workspace:*"
```

### 8. Install and verify

```bash
pnpm install
pnpm test
pnpm infra:cdk synth
```

## Critical Patterns

- Follow the DDD layer separation: domain (interfaces) -> infrastructure (implementations) -> application (use-cases) -> presentation (HTTP)
- Use `@services/shared` for cross-cutting concerns (CORS, error handling, database, logger, tracer)
- Use `@packages/models` for shared schemas and validation
- Lambda functions use ESM format with source maps and X-Ray tracing

## Must NOT Do

- Put business logic in the controller or router
- Import infrastructure directly from use-cases (use repository interfaces)
- Skip adding the service to monitoring (v3)
- Forget to add the workspace dependency to `infra/package.json`
