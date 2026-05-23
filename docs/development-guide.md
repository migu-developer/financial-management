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

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `pnpm ai:setup`  | Generate AI docs for all providers             |
| `pnpm ai:test`   | Run AI docs test suite                         |
| `pnpm ai:skills` | Restore ecosystem skills from skills-lock.json |

The `.ai/` directory is the source of truth for AI agent documentation. Running `pnpm ai:setup` distributes skills, rules, and agents to Claude Code, Codex, Cursor, and Gemini CLI. See [.ai/README.md](../.ai/README.md) for details.

### Skills System

The project uses two complementary skill systems for AI-assisted development:

#### 1. Project Skills (`.ai/skills/`)

Custom skills specific to this project (deploy, migrate, email templates, etc.).
Managed manually by creating `SKILL.md` files under `.ai/skills/{name}/`.
Distributed to AI tools via `pnpm ai:setup`. See [.ai/README.md](../.ai/README.md#adding-skills) for how to add new ones.

#### 2. Ecosystem Skills (`skills-lock.json`)

Third-party skills from external repositories (e.g., Vercel's agent skills).
Managed via the [`skills`](https://www.npmjs.com/package/skills) CLI (`skills@^1.5.7`, pinned in the pnpm catalog).

**How it works:**

- `skills-lock.json` records which external skills are installed, their source
  repo, file path, and integrity hash. This file **must be committed** to the
  repository (similar to `pnpm-lock.yaml`).
- Running `pnpm ai:skills` (alias for `skills experimental_install`) restores
  all skills declared in `skills-lock.json` by downloading them and symlinking
  into the ecosystem skill directories (e.g., `.agents/skills/` for Codex).
  This is separate from project skills, which are authored under `.ai/skills/`
  and distributed by `pnpm ai:setup` into provider-specific directories
  (`.claude/skills/` for Claude Code, `.agents/skills/` for Codex).

**Currently installed ecosystem skills:**

| Skill                         | Source                     | Description                    |
| ----------------------------- | -------------------------- | ------------------------------ |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | React component quality checks |

**Common commands:**

```bash
# Restore all ecosystem skills (run after clone or pnpm install)
pnpm ai:skills

# Add a new skill from a GitHub repository
npx skills add vercel-labs/agent-skills

# Add a specific skill from a repository
npx skills add vercel-labs/agent-skills --skill react-best-practices

# List installed skills
npx skills list

# Update all ecosystem skills to latest versions
npx skills update

# Remove a skill
npx skills remove vercel-react-best-practices
```

**Adding a new ecosystem skill:**

1. Run `npx skills add <owner>/<repo>` (e.g., `npx skills add vercel-labs/agent-skills`).
2. The CLI updates `skills-lock.json` with the new entry.
3. Commit the updated `skills-lock.json`.
4. Other developers run `pnpm ai:skills` to restore.

#### Bootstrap Shortcut

To install both ecosystem and project skills in one step:

```bash
make ai-bootstrap    # runs pnpm ai:skills + pnpm ai:setup
```
