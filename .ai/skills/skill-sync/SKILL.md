---
name: skill-sync
description: |
  Synchronize AI skills after adding or modifying SKILL.md files.
  Reads metadata from all skills and regenerates auto-invoke tables.
  TRIGGER when: a SKILL.md file has been added, modified, or removed.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Synchronizing AI skills'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# skill-sync -- Synchronize AI Skills

## Version

1.0

## Overview

After adding, modifying, or removing skill files in `.ai/skills/`, run the sync
process to ensure all skills are discoverable and their auto-invoke triggers are
registered. The sync process reads YAML frontmatter from all `SKILL.md` files
and generates lookup tables for automatic skill invocation.

## When to Run

- After creating a new skill in `.ai/skills/{name}/SKILL.md`
- After modifying the `auto_invoke` or `scope` metadata of an existing skill
- After deleting a skill directory
- After pulling changes that modify the `.ai/skills/` directory

## Command

```bash
pnpm ai:setup
```

## How It Works

1. **Discovery**: Scans `.ai/skills/*/SKILL.md` for all skill files
2. **Parsing**: Reads YAML frontmatter from each file, extracting:
   - `name` -- Skill identifier
   - `description` -- Including TRIGGER conditions
   - `metadata.scope` -- Filtering scope
   - `metadata.auto_invoke` -- Trigger phrase
3. **Registration**: Generates auto-invoke tables mapping trigger phrases to skills
4. **Validation**: Warns about skills with missing or malformed frontmatter

## Verifying Sync

After running `pnpm ai:setup`, verify skills are registered:

```bash
ls .ai/skills/*/SKILL.md
```

Check that each skill has valid frontmatter:

```bash
for f in .ai/skills/*/SKILL.md; do
  echo "--- $(basename $(dirname $f)) ---"
  head -20 "$f"
  echo ""
done
```

## Skill Directory Structure

```
.ai/
  skills/
    fm-deploy-dev/SKILL.md      -- scope: [infra]
    fm-deploy-prod/SKILL.md     -- scope: [infra]
    fm-migrate/SKILL.md         -- scope: [packages]
    fm-email-templates/SKILL.md -- scope: [packages]
    fm-new-service/SKILL.md     -- scope: [root]
    fm-new-feature/SKILL.md     -- scope: [client]
    fm-test-alarms/SKILL.md     -- scope: [infra]
    skill-creator/SKILL.md      -- scope: [root]
    skill-sync/SKILL.md         -- scope: [root]
```

## Critical Patterns

- Always run sync after any change to `.ai/skills/`
- The `auto_invoke` field must be a clear, unique trigger phrase
- Scope values determine which context the skill applies to
- Skills without valid YAML frontmatter will be skipped during sync

## Must NOT Do

- Forget to run `pnpm ai:setup` after adding or modifying skills
- Manually edit generated auto-invoke tables (they are overwritten on sync)
- Create multiple skills with identical `auto_invoke` phrases
- Remove the `.ai/skills/` directory structure
