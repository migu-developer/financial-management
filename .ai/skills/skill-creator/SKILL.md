---
name: skill-creator
description: |
  Meta-skill for creating new AI skills with proper YAML frontmatter and structure.
  TRIGGER when: creating a new skill, scaffolding a SKILL.md, or documenting a workflow.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Creating a new AI skill'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# skill-creator -- Create New AI Skills

## Version

1.0

## SKILL.md Format

Every skill is a single `SKILL.md` file placed in `.ai/skills/{name}/SKILL.md`.
It must start with YAML frontmatter followed by Markdown content.

### YAML Frontmatter (required)

```yaml
---
name: skill-name
description: |
  Brief description of what the skill does.
  TRIGGER when: specific conditions that activate this skill.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'When doing X'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---
```

### Frontmatter Fields

- `name` -- Unique identifier, lowercase with hyphens
- `description` -- Multi-line description including TRIGGER conditions
- `metadata.version` -- Semantic version of the skill
- `metadata.scope` -- Array of applicable scopes: `[root]`, `[infra]`, `[client]`, `[packages]`
- `metadata.auto_invoke` -- Human-readable trigger phrase
- `allowed-tools` -- Array of Claude Code tools the skill may use

### Required Markdown Sections

1. **Title** (`# skill-name -- Short Description`)
2. **Version** -- Current version number
3. **Critical Patterns** -- Key rules and conventions to follow
4. **Must NOT Do** -- Explicit antipatterns to avoid
5. **Examples** or **Steps** -- Concrete usage examples

## Naming Conventions

### Technology skills

Format: `{technology}-{version}` (e.g. `react-19.1`, `postgresql-17`)
Located in `.ai/skills/` alongside project skills.

### Project-specific skills

Format: `fm-{name}` (e.g. `fm-deploy-dev`, `fm-migrate`, `fm-new-service`)
The `fm-` prefix identifies skills specific to the financial-management project.

### Meta skills

Format: `skill-{name}` (e.g. `skill-creator`, `skill-sync`)
Skills that manage or create other skills.

## Creating a New Skill

### 1. Create the directory

```bash
mkdir -p .ai/skills/{name}
```

### 2. Write the SKILL.md

Follow the format above. Keep the file between 50 and 120 lines.

### 3. Validate the structure

Ensure the file has:

- Valid YAML frontmatter between `---` delimiters
- A top-level heading matching the skill name
- Version, Critical Patterns, and Must NOT Do sections

### 4. Run skill sync

```bash
pnpm ai:setup
```

This regenerates the auto-invoke tables so the new skill is discoverable.

## Best Practices

- Write in English, no emojis
- Keep skills focused on a single workflow or concern
- Include actual commands and file paths from the project
- Reference real source files as examples when applicable
- Target 50-120 lines per skill

## Critical Patterns

- Always include TRIGGER conditions in the description
- Always include Must NOT Do section to prevent common mistakes
- Use `catalog:` references when showing package.json snippets
- Keep frontmatter `scope` accurate to enable proper filtering

## Must NOT Do

- Create skills without YAML frontmatter
- Exceed 120 lines (split into multiple skills instead)
- Use generic examples instead of project-specific ones
- Skip the `pnpm ai:setup` step after creating a skill
- Use emojis in skill content
