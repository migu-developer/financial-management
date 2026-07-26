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

### Issues and the Project Board

Work is tracked in the **[financial-management GitHub Project](https://github.com/orgs/migu-developer/projects/2)**
(org project #2, linked to this repo).

Open issues with one of the templates (blank issues are disabled):

| Template               | Title prefix | Label  |
| ---------------------- | ------------ | ------ |
| 🐛 **Bug Report**      | `fix: `      | `fix`  |
| ✨ **Feature Request** | `feat: `     | `feat` |

Security vulnerabilities go through a **private security advisory** (linked from
the issue chooser), never a public issue.

Project fields:

| Field        | Values                                                      |
| ------------ | ----------------------------------------------------------- |
| **Status**   | Backlog · Todo · In Progress · In Review · Done             |
| **Area**     | Client · Services · Packages · Infra · AI · DevOps · Design |
| **Priority** | P0 · P1 · P2                                                |
| **Size**     | XS · S · M · L · XL                                         |

The project's built-in workflows add new issues to the board as **Todo** and move
them to **Done** when closed.

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

1. Create a branch from `main` (the prefix matters — see above)
2. Make your changes
3. Run all checks locally (see below)
4. Push and create a PR
5. **Labels are applied automatically** from the branch prefix (`feat/` → `feat`,
   `fix/` → `fix`, …) by the `Draft release` job. If your branch has no known
   prefix, add one of the required labels manually: `feat`, `fix`, `docs`,
   `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` — the
   `enforce-label` check requires exactly one of them, and the label determines
   the release-notes category
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

| Version | Stacks                                                                                           | Purpose                                                                           |
| ------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| v1      | Assets, Auth                                                                                     | S3 bucket, Cognito (4 IdPs, MFA, triggers)                                        |
| v2      | ApiGateway, 6 Lambda stacks, StepFunctionsChat, ChatAttachments, AppSyncEvents, ApiDocs, Amplify | REST API, business logic, AI chat workflow, attachments bucket, realtime, hosting |
| v3      | Monitoring                                                                                       | Dashboard, 24 alarms + composite, EventBridge, notifications                      |

### Deploy

```bash
# Synthesize (validate templates)
pnpm infra:cdk synth

# Show changes (always do this first)
pnpm infra:cdk diff

# Deploy all stacks — production is the only environment, so review
# IAM/security changes instead of auto-approving them
pnpm infra:cdk deploy --all --require-approval broadening
```

Before deploying, load the env file with allexport enabled:

```bash
set -a && source config/.env.production && set +a
```

`set -a` is required — a plain `source` does **not** export to child processes,
so CDK would run without the variables. Then export `AWS_PROFILE` for your own
production profile and confirm the account with `aws sts get-caller-identity`.
See `docs/deployment.md` and the `fm-deploy-prod` skill.

### Environment Variables

Environment files live in `config/`:

- `.env.local` — local development
- `.env.production` — prod environment (us-east-2) — **the only deployed environment**
- `.env.development` — legacy dev config; that AWS environment was
  decommissioned in July 2026 (see `docs/deployment.md`)

Required additional variables for exchange rate functionality:

- `EXCHANGE_RATE_API_KEY` -- API key for ExchangeRate-API (used by the update-rates Lambda)
- `EXCHANGE_RATE_API_BASE_URL` -- Base URL for ExchangeRate-API (e.g. `https://v6.exchangerate-api.com`)

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

| Workflow              | Trigger                    | What it does                                               |
| --------------------- | -------------------------- | ---------------------------------------------------------- |
| CI                    | PR + push to main          | lint, typecheck, format, test + Step Functions Local suite |
| Integration Tests     | PR + push to main          | Database integration tests                                 |
| Release Drafter       | push to main / PR          | Refreshes the draft release / autolabels the PR            |
| Deploy Infrastructure | Release published / manual | CDK deploy to production                                   |
| Deploy Client         | Release published / manual | Amplify build trigger                                      |
| Deploy Transactional  | Release published / manual | Email templates to S3                                      |
| Publish API Docs      | After infra deploy         | Swagger UI to S3                                           |

**Production deploys are triggered by publishing a GitHub release**
(non-pre-release). Merging to `main` does **not** deploy anything — staging
deploys are manual-only (`workflow_dispatch`) and the staging AWS environment no
longer exists.

### Releases

Tags are **date-based** (`YYYY.MM.DD.N`, e.g. `2026.07.05.1`), not semver.

1. `release-drafter` keeps a **draft release** updated on every push to `main`,
   listing the PRs merged since the last release, grouped by their label.
2. To ship: open the draft in **Releases**, set the date tag, and **Publish**.
3. Publishing fires the production deploy workflows.

See `docs/deployment.md` for details.

## Security

- Never commit `.env` files, credentials, or API keys
- Use `pnpm-workspace.yaml` catalog for dependency versions
- Security overrides are configured for known CVEs
- All Lambda functions have X-Ray tracing enabled
- API Gateway uses Cognito authorizer on all endpoints
- Database uses Row Level Security (RLS) for data isolation
