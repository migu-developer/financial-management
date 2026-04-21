# Financial Management -- Agent Instructions

## Project Type

pnpm monorepo, TypeScript, AWS CDK, Expo + React Native.

## Commands

```bash
pnpm build           # Build all workspaces
pnpm test            # Run all tests
pnpm lint            # Lint all workspaces
pnpm typecheck       # Type-check all workspaces
pnpm format          # Check formatting
pnpm format:fix      # Fix formatting
```

## Module Map

When working on a specific domain, read the corresponding AGENTS.md for
detailed instructions:

| Domain         | Agent File              | Directory      |
| -------------- | ----------------------- | -------------- |
| Services       | `services/AGENTS.md`    | `services/`    |
| Packages       | `packages/AGENTS.md`    | `packages/`    |
| Client         | `client/main/AGENTS.md` | `client/main/` |
| Infrastructure | `infra/AGENTS.md`       | `infra/`       |

## Critical Rules

- NEVER hardcode secrets, API keys, or credentials in source files.
- NEVER commit `.env` files.
- ALWAYS run tests after making code changes.
- ALWAYS verify build succeeds before committing.
- Follow Domain-Driven Design with bounded contexts.
- Keep files under 500 lines.
- Use typed interfaces for all public APIs.
- Use `catalog:` version specifiers for dependencies in `pnpm-workspace.yaml`.
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).

## Dependency Flow

```
packages/ (shared libraries)
    ^
    |
services/ (backend microservices)     client/ (mobile/web app)
    ^                                     ^
    |                                     |
infra/ (AWS CDK deployment)          client/packages/features/
```

Packages never import from services. Services never import from client.
Infrastructure references services only for Lambda entry points.
