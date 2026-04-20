# @packages/migrations

PostgreSQL schema migration runner for the financial management project. Uses semantic versioning to organize migrations in a directory tree and provides a CLI for applying, rolling back, inspecting, creating, and exporting migrations.

## Responsibility

Manages the lifecycle of the `financial_management` PostgreSQL schema: creating tables, indexes, triggers, RLS policies, seeding catalog data, and tracking applied versions in a `migrations` metadata table. Designed to run against a local Supabase instance or any PostgreSQL database.

## Exports

The package exports types and utilities for use by other packages that need migration-related constructs:

```typescript
// Classes
export { SemanticVersion } from './lib/semantic-version';

// Version config helpers
export { config, sqlScript, tsScript, seedScript } from './lib/version-config';

// Types
export type { ScriptEntry } from './lib/version-config';
export type { Version, VersionConfig } from './interfaces/version';
export type {
  ExecutionFunction,
  UpDownExecution,
} from './interfaces/execution';
export type { MigrationRecord, DatabaseConfig } from './interfaces/database';
```

## CLI Commands

All commands accept an `--env` (`-e`) option to select the environment file (defaults to `local`, which loads `.env.local`).

| Command                 | Description                                                      | Key Options                                            |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm migrate`          | Run all pending migrations (or up to a target)                   | `--to <version>`, `--once`                             |
| `pnpm rollback`         | Rollback the last applied migration                              | `--force` (cross major boundary)                       |
| `pnpm status`           | Show current version, latest available, and pending count        | --                                                     |
| `pnpm create-migration` | Scaffold a new migration directory with version.ts and SQL stubs | `--major`, `--minor`, `-d <description>` (required)    |
| `pnpm export`           | Export schema DDL to a SQL file (strips RLS policies)            | `-o <output-path>` (default: `src/exports/schema.sql`) |

### Examples

```bash
# Apply all pending migrations against local database
pnpm migrate

# Apply only the next pending migration
pnpm migrate -- --once

# Migrate to a specific version
pnpm migrate -- --to 2.1.0

# Check migration status
pnpm status

# Rollback the last migration
pnpm rollback

# Force rollback across a major version boundary
pnpm rollback -- --force

# Create a new patch migration
pnpm create-migration -- -d "Add user preferences table"

# Create a new minor migration
pnpm create-migration -- --minor -d "Add composite indexes"

# Export current schema DDL
pnpm export
```

## Semantic Versioning

Migrations are organized in a `major/minor/patch` directory tree:

```
src/migrations/
  1/0/0/    -> version 1.0.0
  2/0/0/    -> version 2.0.0
  2/0/1/    -> version 2.0.1
  2/1/0/    -> version 2.1.0
```

Each version directory contains:

- `version.ts` -- Configuration (description, script list)
- SQL files -- `{n}_up_{slug}.sql` and `{n}_down_{slug}.sql`
- TypeScript migrations (optional) -- For programmatic migrations

The runner tracks applied versions in a `migrations` table and computes SHA-256 checksums of all migration files per version.

**Cross-major protection:** Rollback across major version boundaries is blocked by default and requires `--force`.

### Script Types

| Type   | Helper                 | Purpose                           |
| ------ | ---------------------- | --------------------------------- |
| `sql`  | `sqlScript(up, down)`  | Standard SQL up/down scripts      |
| `ts`   | `tsScript(path)`       | TypeScript programmatic migration |
| `seed` | `seedScript(up, down)` | Seed data (same structure as SQL) |

## Current Schema (v2.1.0)

### Tables

| Table                 | Description                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| `users`               | User profiles (uid, email, name, locale, picture, phone, document, provider)           |
| `expenses`            | Financial transactions (income/outcome) linked to users, currencies, types, categories |
| `currencies`          | Currency catalog (code, name, symbol, country)                                         |
| `expenses_types`      | Expense type catalog (income / outcome)                                                |
| `expenses_categories` | Optional expense categorization                                                        |
| `documents`           | Document type catalog                                                                  |
| `providers`           | Identity provider catalog                                                              |
| `audit_logs`          | Automatic change history (INSERT/UPDATE/DELETE with old_data/new_data in JSONB)        |

### Triggers

- `fn_set_updated_at` -- Auto-updates `updated_at` on `users` and `expenses` before UPDATE
- `fn_audit_log` -- Logs all changes to `audit_logs` after INSERT/UPDATE/DELETE on `users` and `expenses`

### Row-Level Security

RLS is enabled on all tables with two policy sets:

- **`readonly_lambda_role`** -- SELECT-only on all tables (for Lambda direct database access)
- **`authenticated`** -- Catalog tables are readable by any authenticated user; `users` and `expenses` are scoped to `auth.uid()` ownership

### Migration History

| Version | Description                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `1.0.0` | Create read-only role and user for Lambda access                            |
| `2.0.0` | Create base schema, tables with RLS, functions, triggers and indexes        |
| `2.0.1` | Seed initial catalog data (currencies, expense types, providers, documents) |
| `2.1.0` | Add composite indexes for expenses query performance                        |

## Structure

```
packages/migrations/
  src/
    cli.ts                          # CLI entry point (yargs commands)
    config.ts                       # Environment + database config loader
    index.ts                        # Public exports
    interfaces/
      database.ts                   # MigrationRecord, DatabaseConfig
      execution.ts                  # ExecutionFunction, UpDownExecution
      version.ts                    # Version, VersionConfig
    lib/
      db.ts                         # Pool management, initSchema, setSearchPath
      logger.ts                     # Colored CLI logger
      semantic-version.ts           # SemanticVersion class (parse, compare, sort)
      version-config.ts             # config(), sqlScript(), tsScript(), seedScript()
    runner/
      execute-migration.ts          # executeMigrations(), rollbackLast()
      get-db-version.ts             # ensureMigrationsTable(), getDbVersion()
      get-execution-fn.ts           # Resolves ScriptEntry to ExecutionFunction
      get-version-list.ts           # Scans migration directories
      set-db-version.ts             # setDbVersion(), removeDbVersion()
    migrations/
      1/0/0/                        # v1.0.0 - readonly role
      2/0/0/                        # v2.0.0 - base tables, RLS, triggers
      2/0/1/                        # v2.0.1 - seed data
      2/1/0/                        # v2.1.0 - composite indexes
    exports/
      schema.sql                    # Exported DDL (generated by `pnpm export`)
  .env.local                        # Local database connection string
  package.json
  tsconfig.json
  jest.config.ts
```

## Dependencies

### Internal (workspace)

- `@packages/config` -- ESLint configuration (devDependency)

### External

- `pg` -- PostgreSQL client
- `yargs` -- CLI argument parsing
- `chalk` -- Colored terminal output
- `dotenv` -- Environment file loading
- `tsx` -- TypeScript script execution (devDependency)

## Scripts

| Script             | Command                           | Description              |
| ------------------ | --------------------------------- | ------------------------ |
| `migrate`          | `tsx src/cli.ts migrate`          | Run pending migrations   |
| `rollback`         | `tsx src/cli.ts rollback`         | Rollback last migration  |
| `status`           | `tsx src/cli.ts status`           | Show migration status    |
| `create-migration` | `tsx src/cli.ts create-migration` | Scaffold new migration   |
| `export`           | `tsx src/cli.ts export`           | Export schema DDL        |
| `typecheck`        | `tsc --noEmit`                    | TypeScript type checking |
| `lint`             | `eslint .`                        | Run ESLint               |
| `lint:fix`         | `eslint . --fix`                  | Auto-fix ESLint issues   |
| `test`             | `jest`                            | Run unit tests           |

## Testing

```bash
pnpm test
```

Tests are colocated with source files (`*.test.ts`). The test suite mocks the `pg` module and filesystem calls. A manual `__mocks__/chalk.ts` mock is provided to simplify output assertions.
