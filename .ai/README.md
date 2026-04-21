# .ai/ -- Shared AI Documentation System

This directory provides a single source of truth for AI-assisted development
rules, agent instructions, and skills. It targets multiple tools:

- **Claude Code** -- skills symlinked into `.claude/skills-ai/`
- **Codex** -- skills symlinked into `.codex/skills/`
- **Copilot** -- merged instructions written to `.github/copilot-instructions.md`
- **Cursor** -- rules written to `.cursor/rules/ai-rules.mdc`
- **Gemini CLI** -- merged instructions written to `GEMINI.md`

All tools read the same underlying rules and agent definitions so the team
gets consistent AI guidance regardless of editor choice.

## Directory Structure

```
.ai/
  README.md          # This file
  setup.sh           # Distribution script (run once or after edits)
  setup.test.sh      # Automated tests for setup.sh
  rules/
    global.md        # Tool-agnostic project rules
    services.md      # Backend service rules (DDD, Lambda, PostgreSQL)
    client.md        # Client rules (Expo, NativeWind, atomic design)
    infra.md         # CDK infrastructure rules (stacks, versions)
    packages.md      # Shared packages rules (models, config, cognito)
  agents/
    root.md          # Top-level agent router (dispatches to domain agents)
    services.md      # Agent instructions for services/
    client.md        # Agent instructions for client/
    infra.md         # Agent instructions for infra/
    packages.md      # Agent instructions for packages/
  skills/
    (place SKILL.md files here; setup.sh syncs them to tools)
```

## Quick Start

```bash
# Distribute to all tools
bash .ai/setup.sh --all

# Distribute to a single tool
bash .ai/setup.sh --claude
bash .ai/setup.sh --cursor

# Preview changes without writing
bash .ai/setup.sh --all --dry-run

# Run tests
bash .ai/setup.test.sh
```

## How It Works

`setup.sh` reads files from `.ai/rules/` and `.ai/agents/`, then:

1. Creates symlinks or generates merged markdown files for each tool.
2. Generates `AGENTS.md` at the repository root and in each domain directory
   (`services/`, `packages/`, `client/main/`, `infra/`).
3. Scans `.ai/skills/` for `SKILL.md` files, extracts metadata (scope,
   auto_invoke), and appends an "Auto-invoke Skills" table to each AGENTS.md.

The script is idempotent -- running it multiple times produces the same result.

## Adding Rules

Edit or create a markdown file under `.ai/rules/`. Rules should be
tool-agnostic -- avoid referencing a specific AI tool by name.

After editing, run `bash .ai/setup.sh --all` to redistribute.

## Adding Agents

Edit or create a markdown file under `.ai/agents/`. Each file defines the
scope, commands, patterns, constraints, and dependencies for a domain.

After editing, run `bash .ai/setup.sh --all` to redistribute.

## Adding Skills

Create a directory under `.ai/skills/{name}/` with a `SKILL.md` file. See
`.ai/skills/_example/SKILL.md` for the full template. Include YAML frontmatter
with at least:

```yaml
---
name: my-skill
description: |
  Short summary of what the skill does.
  TRIGGER when: conditions that activate this skill.
metadata:
  version: '1.0.0'
  scope: [services] # one of: root, services, client, infra, packages
  auto_invoke: 'When doing X'
---
```

After adding, run `bash .ai/setup.sh --all` to sync skills to all tools and
update the auto-invoke tables in AGENTS.md files.
