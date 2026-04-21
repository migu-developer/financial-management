---
# Required fields
name: example-skill
description: |
  Brief description of what this skill teaches.
  TRIGGER when: describe the conditions that should activate this skill.

# Metadata
metadata:
  version: '1.0.0' # Exact version from pnpm catalog (for tech skills)
  catalog_ref: 'package: ^1.0.0' # pnpm catalog entry this skill maps to
  scope: [root] # Where this skill applies: root, client, services, infra, packages
  auto_invoke: 'When doing X' # Human-readable trigger for AGENTS.md auto-invoke table

# Tools this skill is allowed to use
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# Skill Name (version)

## Version

package@1.0.0 (from pnpm catalog)

## Critical Patterns

List the patterns that agents MUST follow when working in this skill's domain.
Keep it concise -- only include patterns that prevent real problems.

- Pattern 1: describe the correct approach
- Pattern 2: describe the correct approach
- Pattern 3: describe the correct approach

## Must NOT Do

List anti-patterns that agents must avoid. These should come from real issues
observed in the project, not speculative concerns.

- Do NOT use deprecated API X (removed in version Y)
- Do NOT use pattern Z (causes issue W in this project)

## Examples

Include minimal, focused code examples that demonstrate the correct patterns.
Only include examples that clarify something non-obvious.

```typescript
// Good: correct pattern
const example = correctApproach();

// Bad: anti-pattern (do NOT do this)
// const example = wrongApproach();
```

## References

- [Official docs](https://example.com/docs)

<!-- ────────────────────────────────────────────────────────────────────────
  GUIDELINES FOR WRITING SKILLS:

  Naming conventions:
  - Technology skills: {name}-{major.minor}/SKILL.md  (e.g., react-19.1/)
  - Project skills:    fm-{name}/SKILL.md             (e.g., fm-deploy-dev/)
  - Meta skills:       {name}/SKILL.md                (e.g., skill-creator/)

  Size limits:
  - Technology skills: 80-150 lines max
  - Project skills:    50-120 lines max

  Rules:
  - Every line should earn its place by solving a real problem
  - Do NOT auto-generate with LLMs -- write manually based on observed issues
  - Include the exact version from pnpm-workspace.yaml catalog
  - After creating, run: pnpm ai:setup
──────────────────────────────────────────────────────────────────────── -->
