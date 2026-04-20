# Contributing to Financial Management

Thank you for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- **Node.js** >= 24
- **pnpm** >= 10.29
- **Docker** (for local Supabase)
- **AWS CLI** v2 (for infrastructure deployment)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/migu-developer/financial-management.git
cd financial-management

# Install dependencies
pnpm install

# Setup environment
cp config/.env.local.example config/.env.local
# Edit config/.env.local with your values

# Load environment variables
direnv allow

# Start local database
pnpm supabase:start

# Apply migrations
pnpm migrations:migrate

# Start development
pnpm dev
```

## Development Workflow

### Branch Naming

Use the following prefixes:

| Prefix      | Purpose          | Example                       |
| ----------- | ---------------- | ----------------------------- |
| `feat/`     | New feature      | `feat/expense-filters`        |
| `fix/`      | Bug fix          | `fix/login-redirect`          |
| `refactor/` | Code refactoring | `refactor/expense-repository` |
| `docs/`     | Documentation    | `docs/api-endpoints`          |
| `test/`     | Test additions   | `test/expense-use-cases`      |
| `ci/`       | CI/CD changes    | `ci/deploy-workflow`          |
| `chore/`    | Maintenance      | `chore/upgrade-dependencies`  |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(expenses): add category filtering to GET /expenses
fix(auth): handle expired refresh token on session restore
docs(infra): document v3 monitoring stack alarms
test(users): add integration tests for PATCH /users/{id}
```

Format: `type(scope): description`

- **type**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- **scope**: module name (expenses, auth, infra, cognito, etc.)
- **description**: lowercase, imperative mood, no period

### Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Run all checks locally (see below)
4. Push and create a PR
5. Add one of the required labels: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
6. Wait for CI to pass
7. Request review

## Quality Checks

Run all checks before pushing:

```bash
# All at once
pnpm lint && pnpm typecheck && pnpm format && pnpm test

# Individual checks
pnpm lint          # ESLint across all packages
pnpm lint:fix      # Auto-fix lint issues
pnpm typecheck     # TypeScript type checking
pnpm format        # Prettier check
pnpm format:fix    # Auto-fix formatting
pnpm test          # Unit tests
pnpm test:integration  # Integration tests (requires database)
```

### Running Tests for a Specific Package

```bash
# Single package
pnpm --filter @services/expenses test
pnpm --filter @features/auth test
pnpm --filter @infra test

# Integration tests
pnpm --filter @services/expenses test:integration
```

## Project Structure

This is a pnpm monorepo managed with Turbo. Each module has its own README.md with detailed documentation.

| Directory                   | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `client/main/`              | Expo app (iOS, Android, Web)                        |
| `client/packages/features/` | Feature modules (auth, dashboard, landing, ui)      |
| `client/packages/i18n/`     | Internationalization                                |
| `client/packages/utils/`    | Client utilities                                    |
| `services/`                 | Backend Lambda services                             |
| `services/shared/`          | Shared backend utilities                            |
| `packages/`                 | Shared packages (models, cognito, migrations, etc.) |
| `infra/`                    | AWS CDK infrastructure                              |
| `config/`                   | Environment configurations                          |
| `docs/`                     | Project documentation                               |

## Code Style

### TypeScript

- Strict mode enabled (`strict: true`, `noUncheckedIndexedAccess: true`)
- Target: ES2022
- Module: ES2022 with bundler resolution
- No `any` types — use `unknown` and narrow

### Formatting

- Prettier with: single quotes, trailing commas, 80 char width, 2 space indent
- Configuration in `packages/config/prettier-preset.mjs`

### Linting

- ESLint flat config from `packages/config/eslint.config.ts`
- No `console.log`, `eval`, or `debugger`
- Prefer `const` over `let`

### Architecture

Backend services follow **Domain-Driven Design** with layered architecture:

```
presentation/    # Lambda handler, router, controller, service
application/     # Use cases (single responsibility)
domain/          # Entities, repository interfaces, value objects
infrastructure/  # Repository implementations (PostgreSQL)
```

Frontend features follow the same DDD layers plus:

```
presentation/
  pages/         # Route-level components
  templates/     # Page layouts
  components/
    atoms/       # Basic building blocks
    molecules/   # Composed components
    organisms/   # Complex sections
  providers/     # React contexts
  hooks/         # Custom hooks
```

## Database

### Migrations

```bash
# Create a new migration
pnpm migrations:create-migration --description "add-expense-tags"

# Apply migrations
pnpm migrations:migrate

# Rollback last migration
pnpm migrations:rollback

# Check status
pnpm migrations:status
```

Migrations use semantic versioning: `src/migrations/{major}/{minor}/{patch}/`

### Schema Conventions

- All tables have `created_at`, `updated_at` timestamps
- Audit fields: `created_by`, `modified_by`
- Row Level Security (RLS) enabled on all tables
- Automatic `updated_at` triggers
- Audit log triggers for users and expenses tables

## Infrastructure

### CDK Stacks

| Version | Stacks                                          | Purpose                                          |
| ------- | ----------------------------------------------- | ------------------------------------------------ |
| v1      | Assets, Auth                                    | S3 bucket, Cognito (4 IdPs, MFA, triggers)       |
| v2      | ApiGateway, 4 Lambda services, ApiDocs, Amplify | REST API, business logic, hosting                |
| v3      | Monitoring                                      | Dashboard, 14 alarms, EventBridge, notifications |

### Deploy

```bash
# Synthesize (validate templates)
pnpm infra:cdk synth

# Show changes
pnpm infra:cdk diff

# Deploy all stacks
pnpm infra:cdk deploy --all --require-approval never
```

### Environment Variables

Environment files live in `config/`:

- `.env.local` — local development
- `.env.development` — dev environment (us-east-1)
- `.env.production` — prod environment (us-east-2)

Loaded via `.envrc` (direnv). See the root README.md for the complete variable list.

## Email Templates

```bash
# Preview locally
pnpm email:dev

# Export to HTML
pnpm email:export

# Upload to S3
pnpm email:upload
```

Templates are React Email components in `packages/transactional/`. Two locales: English (en) and Spanish (es).

## CI/CD

All CI runs on GitHub Actions with OIDC authentication (no static AWS keys).

| Workflow              | Trigger            | What it does                  |
| --------------------- | ------------------ | ----------------------------- |
| CI                    | PR + push to main  | lint, typecheck, format, test |
| Integration Tests     | PR + push to main  | Database integration tests    |
| Deploy Infrastructure | After CI on main   | CDK deploy to staging         |
| Deploy Client         | After CI on main   | Amplify build trigger         |
| Deploy Transactional  | After CI on main   | Email templates to S3         |
| Publish API Docs      | After infra deploy | Swagger UI to S3              |

Production deploys are triggered by GitHub releases (non-pre-release).

## Security

- Never commit `.env` files, credentials, or API keys
- Use `pnpm-workspace.yaml` catalog for dependency versions
- Security overrides are configured for known CVEs
- All Lambda functions have X-Ray tracing enabled
- API Gateway uses Cognito authorizer on all endpoints
- Database uses Row Level Security (RLS) for data isolation
