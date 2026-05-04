# @services/currencies

Read-only catalog service that provides the list of supported currencies with their codes, symbols, and associated countries.

## Bounded Context

The **Currencies** bounded context owns the reference catalog of currencies available in the system and their exchange rates. The GET API is read-only; currency records are managed externally via database migrations. Exchange rates are updated automatically by an EventBridge-triggered Lambda that fetches daily rates from ExchangeRate-API and upserts them into the `exchange_rates` table. Other services (notably `@services/expenses`) reference currency IDs as foreign keys when recording monetary values and use exchange rates to compute `global_value` in USD.

## API Endpoints

| Method | Path          | Description                   | Auth               |
| ------ | ------------- | ----------------------------- | ------------------ |
| `GET`  | `/currencies` | List all supported currencies | Cognito Authorizer |

## Architecture

The service follows the same layered Domain-Driven Design architecture as all other services in the monorepo, with a minimal footprint given its read-only nature.

### Presentation Layer

- **`handlers/get-currencies.ts`** -- Lambda handler for GET /currencies. Initializes database, tracer, and logger services at module scope for warm invocation reuse.
- **`handlers/update-rates.ts`** -- Lambda handler for exchange rate updates (EventBridge). Initializes database, tracer, and logger services at module scope.
- **`presentation/application.ts`** -- Composes the Application context from the API Gateway event, user profile, logger, and database service. Defines the single route-to-module mapping.
- **`presentation/controller.ts`** -- Controller handling the GET method for the `/currencies` route.
- **`presentation/router.ts`** -- Presentation-level router resolving modules from the Application's route table.
- **`presentation/service.ts`** -- Service composition layer wiring the use case to the repository.
- **`router.ts`** -- Top-level router using `matchRoute` from `@services/shared` to resolve the request path and dispatch to the controller.

### Application Layer

- **`get-currencies.use-case.ts`** -- Retrieves all currencies with their latest exchange rate from the repository.
- **`update-exchange-rates.use-case.ts`** -- Fetches current rates from ExchangeRate-API, matches them to known currencies, and upserts into the `exchange_rates` table. Returns the count of updated rates.
- **`get-latest-rates.use-case.ts`** -- Retrieves the most recent exchange rate for every currency.

### Domain Layer

- **`currency.entity.ts`** -- Defines the `CurrencyEntity` interface.
- **`currency-with-rate.entity.ts`** -- Extends `CurrencyEntity` with an optional `latest_rate` object (`rate_to_usd`, `rate_date`).
- **`exchange-rate.entity.ts`** -- Defines `ExchangeRateEntity` (full row) and `LatestExchangeRate` (latest rate per currency).
- **`currency.repository.ts`** -- Interface defining the currency repository contract (`findAll`, `findAllWithLatestRates`).
- **`exchange-rate.repository.ts`** -- Interface for exchange rate persistence (`upsertRates`, `findLatestByCurrencyId`, `findAllLatest`).

### Infrastructure Layer

- **`postgres-currency.repository.ts`** -- PostgreSQL implementation with X-Ray traced subsegments via the `@trace` decorator. Uses the read-replica pool for queries. `findAllWithLatestRates()` joins currencies with the latest exchange rate view.
- **`postgres-exchange-rate.repository.ts`** -- PostgreSQL implementation for exchange rate CRUD. Uses the write pool for `upsertRates` (INSERT ON CONFLICT) and the read pool for queries.
- **`exchange-rate-api.service.ts`** -- HTTP client for ExchangeRate-API (`/v6/{apiKey}/latest/USD`). Uses the `@trace` decorator for X-Ray subsegments. Returns a `Record<string, number>` of currency code to rate.

## Domain Entities

### CurrencyEntity

| Field     | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `id`      | `string` | UUID primary key                      |
| `code`    | `string` | ISO 4217 currency code (e.g. "USD")   |
| `name`    | `string` | Full currency name (e.g. "US Dollar") |
| `symbol`  | `string` | Currency symbol (e.g. "$")            |
| `country` | `string` | Country of origin                     |

### CurrencyWithRateEntity

Extends `CurrencyEntity` with:

| Field                     | Type             | Description               |
| ------------------------- | ---------------- | ------------------------- |
| `latest_rate`             | `object \| null` | Latest exchange rate data |
| `latest_rate.rate_to_usd` | `number`         | Rate relative to USD      |
| `latest_rate.rate_date`   | `string`         | Date the rate was fetched |

### ExchangeRateEntity

| Field         | Type     | Description                               |
| ------------- | -------- | ----------------------------------------- |
| `id`          | `string` | UUID primary key                          |
| `currency_id` | `string` | FK to currencies table                    |
| `rate_to_usd` | `number` | Exchange rate relative to USD             |
| `rate_date`   | `string` | Date of the rate (YYYY-MM-DD)             |
| `source`      | `string` | Data source (e.g. "exchangerate-api.com") |
| `created_at`  | `string` | ISO timestamp                             |

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

| Variable                     | Required | Description                                                            |
| ---------------------------- | -------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`               | Yes      | PostgreSQL connection string (write pool)                              |
| `DATABASE_READONLY_URL`      | Yes      | PostgreSQL connection string (read replica pool)                       |
| `ALLOWED_ORIGINS`            | Yes      | Comma-separated list of allowed CORS origins                           |
| `ALLOWED_METHODS`            | No       | Comma-separated list of allowed HTTP methods (recommended for CORS)    |
| `PROJECT_PREFIX`             | No       | Service name prefix for logger (default: `app`)                        |
| `EXCHANGE_RATE_API_KEY`      | Yes      | API key for ExchangeRate-API (used by update-rates handler)            |
| `EXCHANGE_RATE_API_BASE_URL` | Yes      | Base URL for ExchangeRate-API (e.g. `https://v6.exchangerate-api.com`) |

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
services/currencies/
├── eslint.config.ts
├── jest.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── handlers/
    │   ├── get-currencies.ts             # Lambda handler for GET /currencies (CDK entry point)
    │   └── update-rates.ts              # Lambda handler for exchange rate updates (EventBridge)
    ├── exec/                             # Local test scripts
    │   └── get-currencies.ts
    ├── router.ts                         # Top-level route matching + dispatch
    ├── router.test.ts
    ├── application/
    │   └── use-cases/
    │       ├── get-currencies.use-case.ts
    │       ├── get-latest-rates.use-case.ts
    │       └── update-exchange-rates.use-case.ts
    ├── domain/
    │   ├── entities/
    │   │   ├── currency.entity.ts
    │   │   ├── currency-with-rate.entity.ts
    │   │   └── exchange-rate.entity.ts
    │   └── repositories/
    │       ├── currency.repository.ts
    │       └── exchange-rate.repository.ts
    ├── infrastructure/
    │   ├── repositories/
    │   │   ├── postgres-currency.repository.ts
    │   │   └── postgres-exchange-rate.repository.ts
    │   └── services/
    │       └── exchange-rate-api.service.ts
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
    │   ├── currencies.integration.test.ts
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
