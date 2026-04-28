# Development Guide

## Quick Start

```bash
# Start everything (client + local database)
pnpm dev

# Or start individual parts:
pnpm supabase:start        # Local PostgreSQL + Supabase Studio
pnpm migrations:migrate    # Apply database migrations
pnpm --filter @client/main dev  # Expo dev server
```

## Common Commands

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

## Database

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

## Email Templates

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `pnpm email:dev`    | Preview templates locally (React Email dev server) |
| `pnpm email:export` | Export templates to HTML                           |
| `pnpm email:upload` | Upload templates to S3                             |

## Infrastructure

| Command                       | Description                         |
| ----------------------------- | ----------------------------------- |
| `pnpm infra:cdk synth`        | Synthesize CloudFormation templates |
| `pnpm infra:cdk diff`         | Show infrastructure changes         |
| `pnpm infra:cdk deploy --all` | Deploy all stacks                   |

## AI Documentation

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `pnpm ai:setup` | Generate AI docs for all providers |
| `pnpm ai:test`  | Run AI docs test suite             |

The `.ai/` directory is the source of truth for AI agent documentation. Running `pnpm ai:setup` distributes skills, rules, and agents to Claude Code, Codex, Cursor, and Gemini CLI. See [.ai/README.md](../.ai/README.md) for details.
