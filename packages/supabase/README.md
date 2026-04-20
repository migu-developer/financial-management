# @packages/supabase

Local Supabase development environment for the financial management project. Provides a Docker-based PostgreSQL instance with PostgREST API, Auth, Studio, Realtime, Storage, Edge Runtime, and Analytics pre-configured for local development.

## Responsibility

Runs a fully featured Supabase stack locally using the Supabase CLI. The local database serves as the target for `@packages/migrations` and provides the same PostgreSQL environment (version 17) that production uses, enabling developers to test schema changes, RLS policies, and API queries without deploying to a remote instance.

## Exports

This package does not export code. It provides infrastructure configuration only.

## Configuration Summary

The `supabase/config.toml` defines all local service ports and settings:

### Ports

| Service                | Port    | Description                            |
| ---------------------- | ------- | -------------------------------------- |
| API (PostgREST)        | `54321` | REST API for database access           |
| Database (PostgreSQL)  | `54322` | Direct PostgreSQL connection           |
| Shadow Database        | `54320` | Used by `supabase db diff`             |
| Studio                 | `54323` | Web-based database management UI       |
| Inbucket (Email)       | `54324` | Email testing web interface            |
| Analytics              | `54327` | Analytics dashboard (postgres backend) |
| Connection Pooler      | `54329` | PgBouncer (disabled by default)        |
| Edge Runtime Inspector | `8083`  | Chrome DevTools for Edge Functions     |

### Database

| Setting                    | Value                               |
| -------------------------- | ----------------------------------- |
| `project_id`               | `financial-management`              |
| `major_version`            | `17`                                |
| `health_timeout`           | `2m`                                |
| `pooler.pool_mode`         | `transaction` (disabled by default) |
| `pooler.default_pool_size` | `20`                                |
| `pooler.max_client_conn`   | `100`                               |
| `migrations.enabled`       | `true`                              |
| `seed.enabled`             | `true`                              |

### API

| Setting             | Value                          |
| ------------------- | ------------------------------ |
| `schemas`           | `["public", "graphql_public"]` |
| `extra_search_path` | `["public", "extensions"]`     |
| `max_rows`          | `1000`                         |
| `tls.enabled`       | `false`                        |

### Auth

| Setting                         | Value                   |
| ------------------------------- | ----------------------- |
| `site_url`                      | `http://127.0.0.1:3000` |
| `jwt_expiry`                    | `3600` (1 hour)         |
| `enable_signup`                 | `true`                  |
| `enable_anonymous_sign_ins`     | `false`                 |
| `minimum_password_length`       | `6`                     |
| `enable_refresh_token_rotation` | `true`                  |
| `email.enable_confirmations`    | `false`                 |
| `email.otp_length`              | `6`                     |
| `email.otp_expiry`              | `3600`                  |
| `sms.enable_signup`             | `false`                 |
| `mfa.totp`                      | disabled                |
| `mfa.phone`                     | disabled                |

### Storage

| Setting               | Value   |
| --------------------- | ------- |
| `file_size_limit`     | `50MiB` |
| `s3_protocol.enabled` | `true`  |

### Third-Party Auth (all disabled locally)

- Apple
- Firebase
- Auth0
- AWS Cognito
- Clerk
- Solana (Web3)

## Structure

```
packages/supabase/
  supabase/
    config.toml               # Supabase CLI configuration
    .branches/
      _current_branch         # Branch tracking for Supabase CLI
    .gitignore                # Ignores temp files
  .env                        # Local environment variables
  package.json
```

## Usage

### Starting the Local Stack

```bash
cd packages/supabase
pnpm start
```

This starts all Supabase services via Docker. Once running:

- Studio UI: http://localhost:54323
- API endpoint: http://localhost:54321
- Database: `postgresql://postgres:postgres@localhost:54322/postgres`
- Email inbox: http://localhost:54324

### Stopping the Local Stack

```bash
pnpm stop
```

### Checking Status

```bash
pnpm status
```

### Resetting the Database

```bash
pnpm reset
```

This drops and recreates all tables, then re-runs migrations and seeds.

## Integration with Migrations

The `@packages/migrations` package connects to the local Supabase database to manage the `financial_management` schema. The typical local workflow is:

1. `pnpm start` (in this package) -- start Supabase
2. `pnpm migrate` (in `@packages/migrations`) -- apply schema migrations
3. `pnpm export` (in `@packages/migrations`) -- export DDL for integration tests

The default `DATABASE_URL` in `@packages/migrations/.env.local` should point to `postgresql://postgres:postgres@localhost:54322/postgres`.

## Dependencies

### External (devDependency)

- `supabase` -- Supabase CLI

## Scripts

| Script   | Command             | Description                                             |
| -------- | ------------------- | ------------------------------------------------------- |
| `start`  | `supabase start`    | Start all local Supabase services                       |
| `stop`   | `supabase stop`     | Stop all services and Docker containers                 |
| `status` | `supabase status`   | Show running service status and URLs                    |
| `reset`  | `supabase db reset` | Drop and recreate database, re-run migrations and seeds |

## Testing

This package does not contain tests. It provides infrastructure configuration only. Database schema testing is handled by `@packages/migrations`.
