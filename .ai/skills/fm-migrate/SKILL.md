---
name: fm-migrate
description: |
  Manage PostgreSQL database migrations using semantic versioning.
  TRIGGER when: creating, running, rolling back, or checking database migrations.
metadata:
  version: '1.0'
  scope: [packages]
  auto_invoke: 'Working with database migrations'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# fm-migrate -- Database Migrations

## Version

1.0

## Overview

Migrations live in `packages/migrations/` and use a semantic versioning directory
structure: `src/migrations/{major}/{minor}/{patch}/`. Each version directory contains
a `version.ts` config file, SQL up scripts, and SQL down scripts.

## Commands

### Check current status

```bash
pnpm migrations:status
```

Shows the current database version, latest available migration, and pending count.
Defaults to `--env local`. Use `--env development` or `--env production` for other environments.

### Create a new migration

```bash
# Patch bump (default)
pnpm migrations:create-migration --description "add indexes to expenses"

# Minor bump
pnpm migrations:create-migration --minor --description "add documents table"

# Major bump
pnpm migrations:create-migration --major --description "restructure schema"
```

This creates a directory at `src/migrations/{major}/{minor}/{patch}/` with:

- `version.ts` -- migration config with description and script references
- `1_up_{slug}.sql` -- UP migration (apply)
- `1_down_{slug}.sql` -- DOWN migration (rollback)

### Apply pending migrations

```bash
# Apply all pending
pnpm migrations:migrate

# Apply up to a specific version
pnpm migrations:migrate -- --to 2.1.0

# Apply only the next pending migration
pnpm migrations:migrate -- --once

# Target a specific environment
pnpm migrations:migrate -- --env development
```

### Rollback the last migration

```bash
pnpm migrations:rollback

# Force rollback across major version boundaries
pnpm migrations:rollback -- --force
```

### Export schema DDL

```bash
pnpm migrations:export
```

Exports the current schema structure (no data) to `packages/migrations/src/exports/schema.sql`.
Used for integration test setup. Falls back to Docker-based `pg_dump` if local version mismatches.

## Directory Structure Example

```
packages/migrations/src/migrations/
  1/
    0/
      0/  -- version 1.0.0
        version.ts
        1_up_initial_schema.sql
        1_down_initial_schema.sql
  2/
    0/
      0/  -- version 2.0.0
        version.ts
        1_up_restructure.sql
        1_down_restructure.sql
    1/
      0/  -- version 2.1.0
```

## Configuration

The CLI loads database config from environment variables:

- `DATABASE_URL` -- PostgreSQL connection string (required)
- `DATABASE_SCHEMA` -- Schema name (defaults to `financial_management`)

Environment files are loaded from `packages/migrations/.env.{env}` as fallback,
but `direnv` is the primary mechanism.

## Critical Patterns

- Always check `pnpm migrations:status` before applying migrations
- Write both UP and DOWN scripts for every migration
- Run `pnpm migrations:export` after applying migrations to keep the test schema current
- Test migrations locally before applying to development or production

## Must NOT Do

- Apply migrations directly in production without testing in development first
- Skip writing DOWN migration scripts
- Use `--force` rollback without understanding the major version boundary implications
- Modify already-applied migration files (create a new migration instead)
