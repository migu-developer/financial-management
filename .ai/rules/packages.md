# Packages Rules -- Shared Libraries

## Scope

Applies to everything under `packages/` (config, models, migrations,
notifications, cognito, supabase, transactional) and
`client/packages/` (features/ui, features/landing, features/auth,
features/dashboard, i18n, utils).

## Export Conventions

- Use the `exports` field in `package.json` to define public entry points.
- Path aliases use `@packages/<name>` for backend packages and
  `@features/<name>` for client feature packages.
- NEVER import internal files directly -- always go through the exports map.

## Shared Types (@packages/models)

- `@packages/models/shared/utils/http-code` -- HTTP status code constants.
- `@packages/models/shared/utils/errors` -- `ModuleError`,
  `MethodNotImplementedError`, `ServiceNotImplementedError`.
- Domain entities shared across services live here.

## Migrations (@packages/migrations)

- CLI: `pnpm migrations:migrate`, `pnpm migrations:rollback`,
  `pnpm migrations:status`, `pnpm migrations:create-migration`.
- Uses `tsx` for TypeScript execution.
- Follow semantic versioning for migration naming.

## Email Templates (@packages/transactional)

- React Email components for transactional emails.
- Commands: `pnpm email:dev`, `pnpm email:build`, `pnpm email:export`,
  `pnpm email:upload`.
- Uses `@react-email/components` and `@react-email/tailwind`.

## Cognito Triggers (@packages/cognito)

- Located in `packages/cognito/src/`.
- Subdirectories: `custom-message`, `pre-signup`, `user-sync`.
- Custom message trigger loads email templates from S3.
- Pre-signup trigger handles provider linking logic.
- NEVER hardcode Cognito pool IDs -- pass via environment variables.

## Configuration (@packages/config)

- Shared ESLint, TypeScript, and Prettier configs.
- Consumed by all workspaces via `devDependencies: { "@packages/config": "workspace:*" }`.

## Testing Patterns

- Use Jest with `ts-jest` for TypeScript support.
- Mocks go in `src/test/` directories within each package.
- Fixtures: `src/test/fixtures/`.
- Factories: `src/test/factories/`.
- Integration tests: `src/test/*.integration.test.ts`.

## Commands

```bash
# Build all packages
pnpm build

# Test a specific package
pnpm --filter @packages/<name> test

# Supabase local dev
pnpm supabase:start
pnpm supabase:stop
pnpm supabase:status
pnpm supabase:reset
```

## Constraints

- NEVER add runtime dependencies to `@packages/config` -- it is dev-only.
- NEVER import from `services/` inside packages -- packages are shared
  libraries, services depend on packages (not the reverse).
- ALWAYS use `catalog:` version specifiers for dependencies defined in the
  pnpm workspace catalog.
- Keep packages small and focused on a single responsibility.
- Export only what consumers need -- do not re-export internal helpers.
