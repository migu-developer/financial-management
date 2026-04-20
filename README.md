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
│   └── packages/
│       ├── features/
│       │   ├── auth/                # Authentication screens & logic
│       │   ├── dashboard/           # Expense management
│       │   ├── landing/             # Public landing pages
│       │   └── ui/                  # Design system & shared components
│       ├── i18n/                    # Internationalization (en/es)
│       └── utils/                   # Client utilities
│
├── services/                        # Backend Lambda services
│   ├── expenses/                    # CRUD expenses + filters + pagination
│   ├── documents/                   # Document types catalog
│   ├── currencies/                  # Currency catalog
│   ├── users/                       # User profile management
│   └── shared/                      # Database, logging, tracing, CORS
│
├── packages/                        # Shared packages (backend)
│   ├── cognito/                     # Cognito Lambda triggers
│   ├── config/                      # ESLint, Prettier, TSConfig shared
│   ├── migrations/                  # PostgreSQL schema migrations
│   ├── models/                      # Domain types, schemas, validation
│   ├── notifications/               # CloudWatch alarm → SES email alerts
│   ├── supabase/                    # Local Supabase development
│   └── transactional/               # React Email templates (HTML)
│
├── infra/                           # AWS CDK infrastructure
│   └── lib/versions/
│       ├── v1/                      # Auth + Assets (Cognito, S3)
│       ├── v2/                      # API + Services + Hosting
│       └── v3/                      # Monitoring + Alarms + EventBridge
│
├── config/                          # Environment configurations
│   ├── .env.development
│   ├── .env.production
│   └── .env.local
│
└── docs/                            # Project documentation
```

> Each module has its own README.md with detailed documentation. See [Module Documentation](#module-documentation) below.

## Prerequisites

- **Node.js** >= 24
- **pnpm** >= 10.29 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **AWS CLI** v2 (configured with credentials for deployment)
- **Docker** (for local Supabase development)

## Installation

```bash
# Clone the repository
git clone https://github.com/migu-developer/financial-management.git
cd financial-management

# Install all dependencies
pnpm install

# Setup environment variables
cp config/.env.local.example config/.env.local
# Edit config/.env.local with your values

# Load environment (uses direnv)
direnv allow
```

## Development

### Quick Start

```bash
# Start everything (client + local database)
pnpm dev

# Or start individual parts:
pnpm supabase:start        # Local PostgreSQL + Supabase Studio
pnpm migrations:migrate    # Apply database migrations
pnpm --filter @client/main dev  # Expo dev server
```

### Common Commands

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `pnpm build`            | Build all packages (Turbo)          |
| `pnpm dev`              | Start all dev servers               |
| `pnpm test`             | Run all unit tests                  |
| `pnpm test:integration` | Run integration tests (requires DB) |
| `pnpm lint`             | Lint all packages                   |
| `pnpm lint:fix`         | Auto-fix lint issues                |
| `pnpm typecheck`        | TypeScript type checking            |
| `pnpm format`           | Check formatting (Prettier)         |
| `pnpm format:fix`       | Auto-fix formatting                 |

### Database

| Command                                                 | Description                   |
| ------------------------------------------------------- | ----------------------------- |
| `pnpm supabase:start`                                   | Start local Supabase (Docker) |
| `pnpm supabase:stop`                                    | Stop local Supabase           |
| `pnpm supabase:reset`                                   | Reset database                |
| `pnpm migrations:migrate`                               | Apply pending migrations      |
| `pnpm migrations:rollback`                              | Rollback last migration       |
| `pnpm migrations:status`                                | Show migration status         |
| `pnpm migrations:create-migration --description "name"` | Create new migration          |
| `pnpm migrations:export`                                | Export schema DDL             |

### Email Templates

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `pnpm email:dev`    | Preview templates locally (React Email dev server) |
| `pnpm email:export` | Export templates to HTML                           |
| `pnpm email:upload` | Upload templates to S3                             |

### Infrastructure

| Command                       | Description                         |
| ----------------------------- | ----------------------------------- |
| `pnpm infra:cdk synth`        | Synthesize CloudFormation templates |
| `pnpm infra:cdk diff`         | Show infrastructure changes         |
| `pnpm infra:cdk deploy --all` | Deploy all stacks                   |

## Environment Variables

Environment files are stored in `config/` and loaded via `.envrc` (direnv):

| Variable                | Description                                     | Required |
| ----------------------- | ----------------------------------------------- | -------- |
| `AWS_REGION`            | AWS region (us-east-1 or us-east-2)             | Yes      |
| `PROJECT_PREFIX`        | Stack name prefix (e.g. FinancialManagementDev) | Yes      |
| `STAGE`                 | Environment stage (dev / prod)                  | Yes      |
| `DATABASE_URL`          | PostgreSQL write connection string              | Yes      |
| `DATABASE_READONLY_URL` | PostgreSQL read-only connection string          | Yes      |
| `ALLOWED_ORIGINS`       | CORS origins (comma-separated)                  | Yes      |
| `SES_FROM_EMAIL`        | Verified SES sender email                       | Yes      |
| `ALERT_EMAIL_TO`        | Alert notification recipient                    | Yes      |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID                          | Yes      |
| `FACEBOOK_APP_ID`       | Facebook OAuth app ID                           | Yes      |
| `APPLE_CLIENT_ID`       | Apple Sign-In service ID                        | Yes      |
| `MICROSOFT_CLIENT_ID`   | Microsoft OIDC client ID                        | Yes      |

> See `config/.env.development` for the complete list of variables.

## Deployment

### CI/CD Pipelines

| Workflow                   | Trigger                     | Environment        |
| -------------------------- | --------------------------- | ------------------ |
| **CI**                     | PR + push to main           | -                  |
| **Deploy Infrastructure**  | After CI passes on main     | staging            |
| **Deploy Infrastructure**  | GitHub release published    | production         |
| **Deploy Client**          | After CI passes on main     | staging            |
| **Deploy Email Templates** | After CI passes on main     | staging            |
| **Publish API Docs**       | After infrastructure deploy | staging/production |
| **Integration Tests**      | PR + push to main           | -                  |

### Manual Deployment

```bash
# Load environment
echo "development" > config/.env.current && direnv allow

# Deploy all stacks
pnpm infra:cdk deploy --all --require-approval never

# Deploy client
aws amplify start-job --app-id <APP_ID> --branch-name main --job-type RELEASE

# Deploy email templates
pnpm email:export && pnpm email:upload
```

## Module Documentation

### Client

| Module                  | Description                                                    | README                                                                                       |
| ----------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **@client/main**        | Expo app (iOS, Android, Web) with routing, auth, and dashboard | [client/main/README.md](client/main/README.md)                                               |
| **@features/auth**      | Authentication: login, register, MFA, OAuth, password reset    | [client/packages/features/auth/README.md](client/packages/features/auth/README.md)           |
| **@features/dashboard** | Expense CRUD, filtering, pagination, catalogs                  | [client/packages/features/dashboard/README.md](client/packages/features/dashboard/README.md) |
| **@features/landing**   | Public landing, privacy, terms, contact pages                  | [client/packages/features/landing/README.md](client/packages/features/landing/README.md)     |
| **@features/ui**        | Design system: colors, typography, atoms, molecules            | [client/packages/features/ui/README.md](client/packages/features/ui/README.md)               |
| **@packages/i18n**      | Internationalization (English + Spanish)                       | [client/packages/i18n/README.md](client/packages/i18n/README.md)                             |
| **@packages/utils**     | Platform detection, cache, preferences, date formatting        | [client/packages/utils/README.md](client/packages/utils/README.md)                           |

### Backend Services

| Module                   | Description                                  | README                                                         |
| ------------------------ | -------------------------------------------- | -------------------------------------------------------------- |
| **@services/expenses**   | Expense CRUD API with pagination and filters | [services/expenses/README.md](services/expenses/README.md)     |
| **@services/documents**  | Document types catalog API                   | [services/documents/README.md](services/documents/README.md)   |
| **@services/currencies** | Currency catalog API                         | [services/currencies/README.md](services/currencies/README.md) |
| **@services/users**      | User profile management API                  | [services/users/README.md](services/users/README.md)           |
| **@services/shared**     | Database, logging, tracing, CORS utilities   | [services/shared/README.md](services/shared/README.md)         |

### Shared Packages

| Module                      | Description                                       | README                                                               |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| **@packages/cognito**       | Cognito Lambda triggers (auth, sync, email)       | [packages/cognito/README.md](packages/cognito/README.md)             |
| **@packages/config**        | Shared ESLint, Prettier, TypeScript configs       | [packages/config/README.md](packages/config/README.md)               |
| **@packages/migrations**    | PostgreSQL migration runner (semantic versioning) | [packages/migrations/README.md](packages/migrations/README.md)       |
| **@packages/models**        | Domain types, Zod schemas, error classes          | [packages/models/README.md](packages/models/README.md)               |
| **@packages/notifications** | CloudWatch alarm parser + SES email sender        | [packages/notifications/README.md](packages/notifications/README.md) |
| **@packages/supabase**      | Local Supabase development config                 | [packages/supabase/README.md](packages/supabase/README.md)           |
| **@packages/transactional** | React Email templates (7 Cognito + 1 alert)       | [packages/transactional/README.md](packages/transactional/README.md) |

### Infrastructure

| Module     | Description                                     | README                             |
| ---------- | ----------------------------------------------- | ---------------------------------- |
| **@infra** | AWS CDK stacks (v1 Auth, v2 API, v3 Monitoring) | [infra/README.md](infra/README.md) |

## AWS Resources (by region)

### us-east-1 (Development)

| Service     | Resource                  | Name                                                                                                                                                                 |
| ----------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lambda      | 8 functions               | `fm-dev-expenses`, `fm-dev-documents`, `fm-dev-currencies`, `fm-dev-users`, `fm-dev-custom-message`, `fm-dev-user-sync`, `fm-dev-pre-signup`, `fm-dev-notifications` |
| API Gateway | 1 REST API                | Regional with custom domain                                                                                                                                          |
| Cognito     | User Pool + Identity Pool | Google, Facebook, Apple, Microsoft                                                                                                                                   |
| S3          | 1 assets bucket           | `migudev-fm-us-east-1-assets`                                                                                                                                        |
| Amplify     | 1 hosting app             | `dev.financial-management.migudev.com`                                                                                                                               |
| CloudWatch  | 1 dashboard + 14 alarms   | API, Lambda, Cognito triggers                                                                                                                                        |
| EventBridge | 1 rule                    | Amplify build status                                                                                                                                                 |
| Route 53    | 1 hosted zone             | `financial-management.migudev.com`                                                                                                                                   |

### us-east-2 (Production)

Same resources with `fm-prod-*` naming and production domain.

## Author

**Miguel Angel Gutierrez Maya** — [migudev](https://github.com/migu-developer)
