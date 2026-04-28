# Post-Authentication Request Flow

![Post-Authentication Request Flow](https://github.com/user-attachments/assets/f02a6a93-49af-42c1-bed9-ba6e19379bdb)

## Overview

After authentication, all API requests flow through API Gateway with a Cognito authorizer. Each request is validated against the Cognito User Pool, routed to the appropriate Lambda service, processed through DDD layers, and executed against PostgreSQL (Supabase).

## Request Flow

```
Client (Web/Mobile)
  |
  |-- HTTP request + Authorization: Bearer {JWT}
  |
  v
API Gateway (REST, Regional)
  |-- Cognito Authorizer validates JWT
  |-- Rate limiting (per-route throttling)
  |-- Request validation (body/params)
  |
  v
Lambda Function (Node.js 22, ESM)
  |
  |-- exec/index.ts (handler)
  |     |-- Extracts event, creates Application context
  |     |-- ErrorHandler.handle() wraps response
  |
  |-- presentation/router.ts
  |     |-- matchRoute() matches HTTP method + path
  |     |-- Dispatches to module controller
  |
  |-- presentation/controller.ts
  |     |-- HTTP method routing (GET/POST/PUT/PATCH/DELETE)
  |     |-- Delegates to service
  |
  |-- presentation/service.ts
  |     |-- Instantiates repository + use case
  |     |-- Returns Response with HTTP status
  |
  |-- application/use-cases/{name}.ts
  |     |-- Single execute() method
  |     |-- Business logic + validation
  |
  |-- infrastructure/repositories/{name}.ts
  |     |-- PostgreSQL queries (parameterized)
  |     |-- X-Ray traced via Powertools Tracer
  |
  v
PostgreSQL (Supabase)
  |-- Write pool (DATABASE_URL, max 3 connections)
  |-- Read pool (DATABASE_READONLY_URL, max 3 connections)
  |-- SSL auto-detect
  |-- RLS policies for data isolation
```

## API Gateway

| Setting         | Value                                |
| --------------- | ------------------------------------ |
| Type            | REST API (Regional)                  |
| Auth            | Cognito User Pool authorizer         |
| Domain          | Custom domain with ACM wildcard cert |
| TLS             | 1.2 minimum                          |
| Global throttle | 50 RPS burst, 100 RPS rate           |

### Per-route rate limiting

| Method           | Path                   | Burst | Rate |
| ---------------- | ---------------------- | ----- | ---- |
| GET              | `/expenses`            | 20    | 40   |
| POST             | `/expenses`            | 10    | 20   |
| GET              | `/expenses/{id}`       | 20    | 40   |
| PUT              | `/expenses/{id}`       | 10    | 20   |
| PATCH            | `/expenses/{id}`       | 10    | 20   |
| DELETE           | `/expenses/{id}`       | 5     | 10   |
| GET              | `/expenses/types`      | 20    | 40   |
| GET              | `/expenses/categories` | 20    | 40   |
| GET              | `/documents`           | 20    | 40   |
| GET              | `/currencies`          | 20    | 40   |
| POST, GET, PATCH | `/users/*`             | 10    | 20   |

## Lambda Architecture (DDD)

Each Lambda service follows a strict four-layer architecture:

```
exec/                     # Entry point
  index.ts                # Lambda handler, creates Application context
                          # Wraps with ErrorHandler.handle()

presentation/             # HTTP layer
  application.ts          # Request context (logger, db, event, headers)
  router.ts               # Module registration + matchRoute()
  controller.ts           # HTTP method dispatch (mixin composition)
  service.ts              # Orchestrates use cases, returns Response

application/              # Business logic
  use-cases/              # Single-responsibility use cases
                          # Each has one execute() method

domain/                   # Core domain
  entities/               # Optional: read-only catalogs only
  repositories/           # Port interfaces (abstractions)

infrastructure/           # Implementations
  repositories/           # PostgreSQL implementations (adapters)
```

### Controller mixin composition

Controllers extend a `Controller` class built from HTTP method wrappers:

```typescript
// GetWrapper, PostWrapper, PutWrapper, PatchWrapper, DeleteWrapper
const Controller = GetWrapper(
  PostWrapper(PutWrapper(PatchWrapper(DeleteWrapper(Base)))),
);
```

Unimplemented methods throw `MethodNotImplementedError` (405).

## Database

| Property          | Write Pool                   | Read Pool               |
| ----------------- | ---------------------------- | ----------------------- |
| Connection string | `DATABASE_URL`               | `DATABASE_READONLY_URL` |
| Max connections   | 3                            | 3                       |
| SSL               | Auto-detect (enabled in AWS) | Auto-detect             |
| X-Ray tracing     | Yes (via Powertools Tracer)  | Yes                     |

All queries use parameterized statements to prevent SQL injection:

```typescript
const result = await this.db.query(
  'SELECT * FROM expenses WHERE user_id = $1 AND id = $2',
  [userId, expenseId],
);
```

## Error Handling

All errors are caught by `ErrorHandler.handle(error, logger)` in the Lambda handler:

| Error Type                   | HTTP Code              | Description                            |
| ---------------------------- | ---------------------- | -------------------------------------- |
| `ModuleError`                | Custom (set per error) | Domain errors with explicit HTTP codes |
| `MethodNotImplementedError`  | 405                    | HTTP method not supported              |
| `ServiceNotImplementedError` | 501                    | Service method not implemented         |
| Unknown errors               | 500                    | Wrapped as Internal Server Error       |

Response format (API Gateway proxy integration):

```json
{
  "statusCode": 400,
  "headers": { "Content-Type": "application/json", ...corsHeaders },
  "body": "{\"error\": \"Expense not found\"}"
}
```

## CORS

The `addCors()` utility from `@services/shared` adds CORS headers to every response:

- **Origins**: from `ALLOWED_ORIGINS` environment variable (comma-separated)
- **Methods**: from `ALLOWED_METHODS` environment variable (falls back to empty)
- **Headers**: `Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token`

## Available Endpoints

| Service    | Method | Path                   | Description                                 |
| ---------- | ------ | ---------------------- | ------------------------------------------- |
| Expenses   | GET    | `/expenses`            | List expenses (cursor pagination + filters) |
| Expenses   | POST   | `/expenses`            | Create expense                              |
| Expenses   | GET    | `/expenses/{id}`       | Get expense by ID                           |
| Expenses   | PUT    | `/expenses/{id}`       | Update expense                              |
| Expenses   | PATCH  | `/expenses/{id}`       | Partial update expense                      |
| Expenses   | DELETE | `/expenses/{id}`       | Delete expense                              |
| Expenses   | GET    | `/expenses/types`      | List expense types                          |
| Expenses   | GET    | `/expenses/categories` | List expense categories                     |
| Documents  | GET    | `/documents`           | List document types                         |
| Currencies | GET    | `/currencies`          | List currencies                             |
| Users      | POST   | `/users`               | Create user profile                         |
| Users      | GET    | `/users/{id}`          | Get user by UID                             |
| Users      | PATCH  | `/users/{id}`          | Update user profile                         |

## Related Code

| Component                    | Path                                                     |
| ---------------------------- | -------------------------------------------------------- |
| API Gateway CDK stack        | `infra/lib/versions/v2/api-gateway-stack.ts`             |
| Lambda stacks                | `infra/lib/versions/v2/lambda-*.ts`                      |
| Shared database service      | `services/shared/src/database-service/`                  |
| Shared error handler         | `services/shared/src/error-handler/`                     |
| Shared CORS utility          | `services/shared/src/cors/`                              |
| Expenses service (reference) | `services/expenses/src/`                                 |
| Dashboard API client         | `client/packages/features/dashboard/src/infrastructure/` |
