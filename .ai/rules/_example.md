# Rule: Domain Name

<!-- This file defines passive rules that agents must ALWAYS follow when working
     in this domain. Rules are injected into AGENTS.md, copilot-instructions.md,
     cursor rules, and GEMINI.md by `pnpm ai:setup`. -->

## Scope

Describe which modules or directories this rule applies to.

## Architecture

Describe the required architecture patterns for this domain.
Only include patterns that agents need to follow -- not explanations of how
the code works (that belongs in README.md).

- Pattern 1
- Pattern 2

## Commands

```bash
# Build
pnpm --filter @scope/package build

# Test
pnpm --filter @scope/package test

# Lint
pnpm --filter @scope/package lint
```

## Constraints

What agents must NOT do in this domain.

- Do NOT create files outside of the defined directory structure
- Do NOT bypass validation at system boundaries
- Do NOT hardcode values that should come from environment variables

## Environment Variables

| Variable      | Required | Description                  |
| ------------- | -------- | ---------------------------- |
| `EXAMPLE_VAR` | Yes      | Description of this variable |

<!-- ────────────────────────────────────────────────────────────────────────
  GUIDELINES FOR WRITING RULES:

  Naming: {domain}.md (e.g., services.md, client.md, infra.md)

  Size: < 100 lines per file

  Content:
  - Only rules that respond to real problems observed in the project
  - Tool-agnostic (no Claude-specific or Cursor-specific references)
  - Concise and actionable -- agents read these on every interaction
  - After creating, run: pnpm ai:setup
──────────────────────────────────────────────────────────────────────── -->
