# Domain Name — Agent Instructions

<!-- This file generates a domain-level AGENTS.md file (e.g., services/AGENTS.md).
     It tells agents HOW to work in this domain without breaking things.
     The auto-invoke skills table is appended automatically by setup.sh. -->

## Scope

List the modules this agent file covers:

- `path/to/module-a/` -- Description
- `path/to/module-b/` -- Description

## Commands

```bash
# Build
pnpm --filter @scope/package build

# Test
pnpm --filter @scope/package test

# Lint
pnpm --filter @scope/package lint

# Typecheck
pnpm --filter @scope/package typecheck
```

## Patterns

Describe the required patterns agents must follow:

1. **Architecture**: DDD with layers (presentation, application, domain, infrastructure)
2. **Testing**: TDD London School with mocks
3. **Naming**: describe naming conventions

## Constraints

- Do NOT modify files outside this domain without reading the target domain's AGENTS.md
- Do NOT skip tests after making code changes
- Do NOT add dependencies without checking the pnpm catalog first

## Dependencies

Describe how this domain relates to other domains:

- Depends on: `@packages/models` (shared types)
- Used by: `infra/` (CDK stacks reference this domain's Lambdas)

<!-- ────────────────────────────────────────────────────────────────────────
  GUIDELINES FOR WRITING AGENTS:

  Naming: {domain}.md (e.g., services.md, client.md, infra.md, packages.md)
  Special: root.md generates the top-level AGENTS.md (router)

  Size: 50-80 lines per file

  Output mapping:
  - agents/root.md      -> AGENTS.md (repo root)
  - agents/services.md  -> services/AGENTS.md
  - agents/client.md    -> client/main/AGENTS.md
  - agents/infra.md     -> infra/AGENTS.md
  - agents/packages.md  -> packages/AGENTS.md

  Content:
  - Focus on "how to work here" not "what this does" (that's README.md)
  - Include build/test/lint commands specific to this domain
  - List constraints that prevent common mistakes
  - After creating, run: pnpm ai:setup
──────────────────────────────────────────────────────────────────────── -->
