# Financial Management

Personal finance management platform built as a monorepo. Track expenses, manage currencies, and visualize spending across web and mobile.

## Problem

Managing personal finances across multiple currencies and expense categories requires a centralized system that works on any device, supports multi-factor authentication, and provides real-time insights into spending patterns.

## Solution

A full-stack application with:

- **Mobile + Web app** (React Native / Expo) with offline-capable auth and real-time expense tracking
- **Serverless backend** (AWS Lambda) with cursor-based pagination and filtering
- **Infrastructure as Code** (AWS CDK) with multi-region deployment, observability, and automated alerting
- **Multi-provider authentication** (Google, Facebook, Apple, Microsoft) via Cognito with TOTP MFA

## Architecture

```
                    +------------------+
                    |   Amplify (Web)  |
                    |  Expo (Mobile)   |
                    +--------+---------+
                             |
                    +--------+---------+
                    |   API Gateway    |
                    | (REST + Cognito) |
                    +--------+---------+
                             |
          +--------+---------+---------+--------+
          |        |         |         |        |
     +----+--+ +---+---+ +--+----+ +--+----+   |
     |Expenses| |Docs   | |Curren.| |Users  |   |
     |Lambda  | |Lambda | |Lambda | |Lambda |   |
     +----+---+ +---+---+ +--+---+ +--+----+   |
          |        |         |         |        |
          +--------+---------+---------+        |
                   |                            |
            +------+------+            +--------+--------+
            |  PostgreSQL |            |    Cognito      |
            |  (Supabase) |            | (User Pool +    |
            +-------------+            |  Identity Pool) |
                                       +-----------------+
```

## Tech Stack

| Layer             | Technology                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| **Client**        | React Native 0.81, Expo 54, NativeWind (Tailwind), TypeScript                  |
| **Backend**       | AWS Lambda (Node.js 22), API Gateway REST, PostgreSQL (Supabase)               |
| **Auth**          | AWS Cognito (User Pool + Identity Pool), Google/Facebook/Apple/Microsoft OAuth |
| **Infra**         | AWS CDK (TypeScript), CloudFormation, multi-region (us-east-1, us-east-2)      |
| **Observability** | CloudWatch (dashboard + 14 alarms), X-Ray tracing, EventBridge, SNS alerts     |
| **Email**         | React Email templates, SES, S3-based template storage                          |
| **CI/CD**         | GitHub Actions (OIDC auth), Turbo, pnpm workspaces                             |
| **Database**      | PostgreSQL 17, semantic versioning migrations, RLS policies, audit logging     |

## Monorepo Structure

```
financial-management/
├── client/                          # Frontend applications
│   ├── main/                        # Expo app (web + mobile)
│   └── packages/features/           # auth, dashboard, landing, ui, i18n, utils
├── services/                        # Backend Lambda services
│   ├── expenses/                    # CRUD + filters + pagination
│   ├── documents/                   # Document types catalog
│   ├── currencies/                  # Currency catalog
│   ├── users/                       # User profile management
│   └── shared/                      # Database, logging, tracing, CORS
├── packages/                        # Shared packages
│   ├── cognito/                     # Cognito Lambda triggers
│   ├── config/                      # ESLint, Prettier, TSConfig
│   ├── migrations/                  # PostgreSQL schema migrations
│   ├── models/                      # Domain types, schemas, validation
│   ├── notifications/               # CloudWatch alarm alerts
│   ├── supabase/                    # Local development
│   └── transactional/               # React Email templates
├── infra/                           # AWS CDK (v1 Auth, v2 API, v3 Monitoring)
├── config/                          # Environment files (.env.*)
├── docs/                            # Architecture and flow documentation
└── .ai/                             # AI agent docs (skills, rules, agents)
```

> Each module has its own README.md. See [Module Documentation](#module-documentation) below.

## Prerequisites

- **Node.js** >= 24
- **pnpm** >= 10.29 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **AWS CLI** v2 (for deployment)
- **Docker** (for local Supabase)

## Getting Started

```bash
git clone https://github.com/migu-developer/financial-management.git
cd financial-management
pnpm install
cp config/.env.local.example config/.env.local   # edit with your values
direnv allow
pnpm supabase:start && pnpm migrations:migrate
pnpm dev
```

> For the full command reference, see [Development Guide](docs/development-guide.md).

## Documentation

### Architecture Flows

| Document                                                         | Description                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| [Authentication and Registration](docs/auth-register-flow.md)    | Cognito signup, social providers, MFA, email templates via S3 |
| [Post-Authentication Requests](docs/post-authentication-flow.md) | JWT validation, API Gateway routing, DDD Lambda architecture  |
| [Observability and Monitoring](docs/observability-flow.md)       | CloudWatch dashboard, 14 alarms, SNS alert pipeline, X-Ray    |

### Operations

| Document                                       | Description                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| [Development Guide](docs/development-guide.md) | Commands for build, test, lint, database, email, infra, AI docs      |
| [Deployment](docs/deployment.md)               | Environment variables, CI/CD pipelines, manual deploy, AWS resources |
| [Contributing](CONTRIBUTING.md)                | Branch naming, commit conventions, PR process, code style            |

## Module Documentation

### Client

| Module                  | Description                                   | README                                                                              |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| **@client/main**        | Expo app (iOS, Android, Web)                  | [client/main/](client/main/README.md)                                               |
| **@features/auth**      | Login, register, MFA, OAuth, password reset   | [client/packages/features/auth/](client/packages/features/auth/README.md)           |
| **@features/dashboard** | Expense CRUD, filtering, pagination           | [client/packages/features/dashboard/](client/packages/features/dashboard/README.md) |
| **@features/landing**   | Public landing, privacy, terms, contact       | [client/packages/features/landing/](client/packages/features/landing/README.md)     |
| **@features/ui**        | Design system: colors, typography, components | [client/packages/features/ui/](client/packages/features/ui/README.md)               |
| **@packages/i18n**      | Internationalization (en/es)                  | [client/packages/i18n/](client/packages/i18n/README.md)                             |
| **@packages/utils**     | Platform detection, cache, date formatting    | [client/packages/utils/](client/packages/utils/README.md)                           |

### Backend Services

| Module                   | Description                                  | README                                                |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------- |
| **@services/expenses**   | Expense CRUD API with pagination and filters | [services/expenses/](services/expenses/README.md)     |
| **@services/documents**  | Document types catalog API                   | [services/documents/](services/documents/README.md)   |
| **@services/currencies** | Currency catalog API                         | [services/currencies/](services/currencies/README.md) |
| **@services/users**      | User profile management API                  | [services/users/](services/users/README.md)           |
| **@services/shared**     | Database, logging, tracing, CORS utilities   | [services/shared/](services/shared/README.md)         |

### Shared Packages

| Module                      | Description                                 | README                                                      |
| --------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| **@packages/cognito**       | Cognito Lambda triggers (auth, sync, email) | [packages/cognito/](packages/cognito/README.md)             |
| **@packages/config**        | Shared ESLint, Prettier, TypeScript configs | [packages/config/](packages/config/README.md)               |
| **@packages/migrations**    | PostgreSQL migration runner                 | [packages/migrations/](packages/migrations/README.md)       |
| **@packages/models**        | Domain types, Zod schemas, error classes    | [packages/models/](packages/models/README.md)               |
| **@packages/notifications** | CloudWatch alarm parser + SES email         | [packages/notifications/](packages/notifications/README.md) |
| **@packages/supabase**      | Local Supabase development config           | [packages/supabase/](packages/supabase/README.md)           |
| **@packages/transactional** | React Email templates (7 Cognito + 1 alert) | [packages/transactional/](packages/transactional/README.md) |

### Infrastructure

| Module     | Description                                     | README                    |
| ---------- | ----------------------------------------------- | ------------------------- |
| **@infra** | AWS CDK stacks (v1 Auth, v2 API, v3 Monitoring) | [infra/](infra/README.md) |

## Author

**Miguel Angel Gutierrez Maya** -- [migudev](https://github.com/migu-developer)
