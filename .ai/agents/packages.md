# Packages Agent Instructions

## Scope

Shared libraries under `packages/` (config, models, migrations, notifications,
cognito, supabase, transactional) and `client/packages/` (i18n, utils,
features/ui, features/landing, features/auth, features/dashboard).

## Commands

```bash
pnpm --filter @packages/<name> build     # Build one package
pnpm --filter @packages/<name> test      # Test one package
pnpm --filter @packages/<name> lint      # Lint one package
pnpm email:dev                           # Dev server for email templates
pnpm email:build                         # Build email templates
pnpm supabase:start                      # Start local Supabase
pnpm supabase:stop                       # Stop local Supabase
pnpm migrations:migrate                  # Run DB migrations
pnpm migrations:rollback                 # Rollback last migration
pnpm migrations:status                   # Show migration status
pnpm migrations:create-migration         # Create new migration
```

## Patterns

### Exports

- Use `exports` field in `package.json` for public entry points.
- Path aliases: `@packages/<name>` (backend), `@features/<name>` (client).
- Never import internal files directly.

### Shared Types (@packages/models)

- `shared/utils/http-code` -- HTTP status constants.
- `shared/utils/errors` -- `ModuleError`, `MethodNotImplementedError`,
  `ServiceNotImplementedError`.

### Cognito Triggers (@packages/cognito)

- `custom-message` -- loads email templates from S3.
- `pre-signup` -- provider linking logic.
- `user-sync` -- syncs Cognito users with the database.
- Never hardcode Cognito pool IDs.

### Email Templates (@packages/transactional)

- React Email components with `@react-email/tailwind`.
- Export/upload workflow: `email:build` then `email:upload`.

### Testing

- Jest + ts-jest.
- Mocks in `src/test/`.
- Fixtures in `src/test/fixtures/`.
- Factories in `src/test/factories/`.

## Constraints

- NEVER add runtime deps to `@packages/config` (dev-only).
- NEVER import from `services/` inside packages (wrong direction).
- ALWAYS use `catalog:` version specifiers.
- Keep packages small and single-purpose.
- Export only what consumers need.

## Dependencies

- `react-email: ^5.2.10` (transactional package)
- `pg: ^8.20.0` (migrations)
- `amazon-cognito-identity-js: ^6.3.16` (cognito triggers)
- `@aws-sdk/client-s3`, `@aws-sdk/client-ses` (email/cognito infra)
