# Global Rules -- Financial Management Monorepo

## Project Overview

pnpm monorepo (pnpm@10.29.3) with Turborepo orchestration.
Node.js >= 24, TypeScript 5.9+.

Workspaces: `client/*`, `client/packages/*`, `client/packages/features/*`,
`packages/*`, `services/*`, `infra`.

## Behavioral Rules

- Do what has been asked; nothing more, nothing less.
- NEVER create files unless they are absolutely necessary for the goal.
- ALWAYS prefer editing an existing file to creating a new one.
- NEVER proactively create documentation files unless explicitly requested.
- NEVER save working files or tests to the root folder.
- ALWAYS read a file before editing it.

## File Organization

- `/services` -- backend Lambda microservices (DDD).
- `/packages` -- shared libraries (config, models, migrations, cognito, etc.).
- `/client/main` -- Expo + React Native mobile/web app.
- `/client/packages/features` -- feature packages (ui, landing, auth, dashboard).
- `/infra` -- AWS CDK stacks organized by version (v1, v2, v3).
- `/docs` -- documentation and markdown files.
- `/config` -- configuration files.
- `/scripts` -- utility scripts.

## Architecture

- Follow Domain-Driven Design with bounded contexts.
- Keep files under 500 lines.
- Use typed interfaces for all public APIs.
- Prefer TDD London School (mock-first) for new code.
- Ensure input validation at system boundaries.

## Imports -- Path Aliases Only

- NEVER use relative paths (`../../`) for cross-module imports.
- Use path aliases configured in tsconfig: `@services/<name>`,
  `@packages/<name>`, `@features/<name>`, `@client/main`.
- Relative imports (`./`, `../`) are only acceptable within the same
  directory or one level up inside the same module.

## Testing Conventions

- ALWAYS write unit tests for new use cases and services.
- ALWAYS write integration tests for new repository methods and endpoints.
- Test files are **co-located** next to the source file: `foo.ts` →
  `foo.test.ts` (same directory). Do NOT create `__tests__/` folders.
- Exception: `client/main/` uses `client/main/tests/` with a mirror of the
  app/ structure because Expo Router treats files in `app/` as routes.
- Integration tests go in `src/test/` within each service/package.
- Test helpers (mocks, fixtures, factories) go in `src/test/` subdirectories.
- Name integration tests `*.integration.test.ts` to distinguish from unit tests.

## Build, Test, and Lint

```bash
# Build all workspaces
pnpm build          # or: npx turbo build

# Run all tests
pnpm test           # or: npx turbo test

# Lint all workspaces
pnpm lint           # or: npx turbo lint

# Type-check
pnpm typecheck      # or: npx turbo typecheck

# Format check / fix
pnpm format
pnpm format:fix
```

- ALWAYS run tests after making code changes.
- ALWAYS verify build succeeds before committing.

## pnpm Catalog

Shared dependency versions are pinned in `pnpm-workspace.yaml` under `catalog:`.
When adding ANY new dependency to ANY workspace:

1. First add the version to `catalog:` in `pnpm-workspace.yaml`
2. Then reference it as `"catalog:"` in the package.json
   NEVER add a version directly in a package.json — always go through the catalog.

Key catalog versions:

- `react: 19.1.0`, `react-dom: 19.1.0`
- `react-native: 0.81.5`
- `typescript: ^5.9.3`
- `expo: ~54.0.33`
- `aws-cdk-lib: ^2.248.0`
- `jest: ^30.3.0` (catalog; client/main uses `jest@~29.7.0` directly)
- `nativewind: ^4.2.3`, `tailwindcss: ^4.2.2`

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files.
- NEVER commit `.env` files or any file containing secrets.
- Always validate user input at system boundaries.
- Always sanitize file paths to prevent directory traversal.
- Use parameterized queries for database access.

## Concurrency Rules

- All related operations MUST run concurrently/in parallel.
- Batch all file reads/writes/edits in one step.
- Batch all independent shell commands in one step.

## Git Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- Commitlint enforces `@commitlint/config-conventional`.
- Husky manages Git hooks.
