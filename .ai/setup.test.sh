#!/usr/bin/env bash

RED='\033[0;31m'; GREEN='\033[0;32m'; BOLD='\033[1m'; RESET='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASS=0; FAIL=0; TOTAL=0

pass() { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); printf "  ${GREEN}PASS${RESET}  %s\n" "$1"; }
fail() { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); printf "  ${RED}FAIL${RESET}  %s\n" "$1"; }
assert_exists()   { [[ -f "$1" ]] && pass "${2:-$1} exists" || fail "${2:-$1} missing"; }
assert_not_empty() { [[ -s "$1" ]] && pass "${2:-$1} not empty" || fail "${2:-$1} empty"; }
assert_symlink()  { [[ -L "$1" ]] && pass "${2:-$1} is symlink" || fail "${2:-$1} not symlink"; }
assert_contains() { [[ -f "$1" ]] && grep -q "$2" "$1" && pass "${3:-$1 contains '$2'}" || fail "${3:-$1 missing '$2'}"; }
assert_dir()      { [[ -d "$1" ]] && pass "${2:-$1} is dir" || fail "${2:-$1} not dir"; }
assert_missing()  { [[ ! -e "$1" ]] && pass "${2:-$1} not created" || fail "${2:-$1} should not exist"; }

create_test_repo() {
  local tmp; tmp="$(mktemp -d)"
  cp -R "$SCRIPT_DIR" "$tmp/.ai"
  mkdir -p "$tmp/services" "$tmp/packages" "$tmp/client/main" "$tmp/infra" "$tmp/.claude"

  # Create sample skill with nested metadata
  mkdir -p "$tmp/.ai/skills/test-skill"
  cat > "$tmp/.ai/skills/test-skill/SKILL.md" << 'SK'
---
name: test-skill
description: |
  Test skill for validation.
  TRIGGER when: running tests.
metadata:
  version: '1.0.0'
  scope: [root, client, services, packages, infra]
  auto_invoke: 'When running tests'
allowed-tools: [Read, Grep]
---

# Test Skill

## Critical Patterns

- Always validate input
SK
  echo "$tmp"
}

cleanup() { [[ -n "${TD:-}" && -d "$TD" ]] && cd / && rm -rf "$TD"; }
trap cleanup EXIT

# ── Test: --all generates everything ───────────────────────────────────────

test_all() {
  printf "\n${BOLD}Test: --all generates all provider files${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --all > /dev/null 2>&1

  # Root files
  assert_exists "$TD/AGENTS.md" "Root AGENTS.md"
  assert_exists "$TD/GEMINI.md" "Root GEMINI.md"

  # Domain AGENTS.md
  assert_exists "$TD/services/AGENTS.md" "services/AGENTS.md"
  assert_exists "$TD/packages/AGENTS.md" "packages/AGENTS.md"
  assert_exists "$TD/client/main/AGENTS.md" "client/main/AGENTS.md"
  assert_exists "$TD/infra/AGENTS.md" "infra/AGENTS.md"

  # Claude: rules + agents + skills
  assert_dir "$TD/.claude/rules" "Claude rules dir"
  assert_exists "$TD/.claude/rules/global.md" "Claude global rule"
  assert_exists "$TD/.claude/rules/services.md" "Claude services rule"
  assert_exists "$TD/.claude/rules/client.md" "Claude client rule"
  assert_exists "$TD/.claude/rules/infra.md" "Claude infra rule"
  assert_exists "$TD/.claude/rules/packages.md" "Claude packages rule"
  assert_dir "$TD/.claude/agents" "Claude agents dir"
  assert_exists "$TD/.claude/agents/root.md" "Claude root agent"
  assert_exists "$TD/.claude/agents/services.md" "Claude services agent"
  assert_exists "$TD/.claude/agents/client.md" "Claude client agent"
  assert_exists "$TD/.claude/agents/infra.md" "Claude infra agent"
  assert_exists "$TD/.claude/agents/packages.md" "Claude packages agent"
  assert_contains "$TD/.claude/agents/root.md" "name: root" "Claude agent has frontmatter"
  assert_symlink "$TD/.claude/skills/test-skill" "Claude test-skill symlink"

  # Cursor: rules + skills + agents
  assert_exists "$TD/.cursor/rules/global.mdc" "Cursor global rule"
  assert_exists "$TD/.cursor/rules/services.mdc" "Cursor services rule"
  assert_exists "$TD/.cursor/rules/client.mdc" "Cursor client rule"
  assert_exists "$TD/.cursor/rules/infra.mdc" "Cursor infra rule"
  assert_exists "$TD/.cursor/rules/packages.mdc" "Cursor packages rule"
  assert_symlink "$TD/.cursor/skills/test-skill" "Cursor test-skill symlink"
  assert_exists "$TD/.cursor/agents/root.md" "Cursor root agent"
  assert_exists "$TD/.cursor/agents/services.md" "Cursor services agent"

  # Codex: .agents/skills + .codex/agents
  assert_symlink "$TD/.agents/skills/test-skill" "Codex test-skill symlink"
  assert_exists "$TD/.codex/agents/root.toml" "Codex root agent"
  assert_exists "$TD/.codex/agents/services.toml" "Codex services agent"
  assert_exists "$TD/.codex/agents/client.toml" "Codex client agent"

  # Gemini: GEMINI.md + settings + agents
  assert_exists "$TD/.gemini/settings.json" "Gemini settings"
  assert_exists "$TD/.gemini/agents/root.md" "Gemini root agent"
  assert_exists "$TD/.gemini/agents/services.md" "Gemini services agent"

  cd / && rm -rf "$TD"
}

# ── Test: Gemini has ALL content compacted ─────────────────────────────────

test_gemini_compacted() {
  printf "\n${BOLD}Test: Gemini compacts all rules + agents + skills${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --gemini > /dev/null 2>&1

  local f="$TD/GEMINI.md"
  assert_contains "$f" "Module Map" "Gemini has root agent"
  assert_contains "$f" "test-skill" "Gemini has skill content"
  assert_contains "$f" "Always validate input" "Gemini has skill patterns"

  cd / && rm -rf "$TD"
}

# ── Test: New skill gets distributed to all providers ──────────────────────

test_new_skill_distributed() {
  printf "\n${BOLD}Test: Adding new skill distributes to all providers${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"

  mkdir -p "$TD/.ai/skills/new-feature"
  cat > "$TD/.ai/skills/new-feature/SKILL.md" << 'SK2'
---
name: new-feature
description: New feature skill added after initial setup.
metadata:
  version: '2.0.0'
  scope: [root, client]
  auto_invoke: 'When creating new features'
allowed-tools: [Read, Write]
---

# New Feature Skill

## Critical Patterns

- Follow feature flag patterns
SK2

  bash "$TD/.ai/setup.sh" --all > /dev/null 2>&1

  # Claude
  assert_symlink "$TD/.claude/skills/new-feature" "Claude new-feature skill"

  # Cursor
  assert_symlink "$TD/.cursor/skills/new-feature" "Cursor new-feature skill"

  # Codex
  assert_symlink "$TD/.agents/skills/new-feature" "Codex new-feature skill"

  # Gemini compacted
  assert_contains "$TD/GEMINI.md" "new-feature" "Gemini has new skill"
  assert_contains "$TD/GEMINI.md" "feature flag patterns" "Gemini has new skill content"

  # AGENTS.md auto-invoke table
  assert_contains "$TD/AGENTS.md" "new-feature" "AGENTS.md lists new skill"

  cd / && rm -rf "$TD"
}

# ── Test: New rule gets distributed to all providers ───────────────────────

test_new_rule_distributed() {
  printf "\n${BOLD}Test: Adding new rule distributes to all providers${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"

  cat > "$TD/.ai/rules/security.md" << 'RULE'
# Rule: Security

## Scope

All modules.

## Constraints

- Never store credentials in source code
- Always use parameterized queries
RULE

  bash "$TD/.ai/setup.sh" --all > /dev/null 2>&1

  # Claude
  assert_exists "$TD/.claude/rules/security.md" "Claude security rule"

  # Cursor
  assert_exists "$TD/.cursor/rules/security.mdc" "Cursor security rule"

  # Gemini compacted
  assert_contains "$TD/GEMINI.md" "parameterized queries" "Gemini has security rule"

  cd / && rm -rf "$TD"
}

# ── Test: Dry run ──────────────────────────────────────────────────────────

test_dry_run() {
  printf "\n${BOLD}Test: --dry-run creates no files${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --all --dry-run > /dev/null 2>&1

  assert_missing "$TD/GEMINI.md" "GEMINI.md in dry-run"
  assert_missing "$TD/AGENTS.md" "AGENTS.md in dry-run"

  cd / && rm -rf "$TD"
}

# ── Test: Idempotency ─────────────────────────────────────────────────────

test_idempotency() {
  printf "\n${BOLD}Test: Running twice produces same result${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"

  bash "$TD/.ai/setup.sh" --all > /dev/null 2>&1
  local h1; h1="$(cat "$TD/AGENTS.md" | md5 2>/dev/null || md5sum "$TD/AGENTS.md" | cut -d' ' -f1)"

  bash "$TD/.ai/setup.sh" --all > /dev/null 2>&1
  local h2; h2="$(cat "$TD/AGENTS.md" | md5 2>/dev/null || md5sum "$TD/AGENTS.md" | cut -d' ' -f1)"

  [[ "$h1" == "$h2" ]] && pass "AGENTS.md identical after second run" || fail "AGENTS.md differs"

  cd / && rm -rf "$TD"
}

# ── Test: Cursor .mdc frontmatter ─────────────────────────────────────────

test_cursor_frontmatter() {
  printf "\n${BOLD}Test: Cursor .mdc files have correct frontmatter${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --cursor > /dev/null 2>&1

  assert_contains "$TD/.cursor/rules/global.mdc" "alwaysApply: true" "global rule is alwaysApply"
  assert_contains "$TD/.cursor/rules/services.mdc" "alwaysApply: false" "services rule is conditional"
  assert_contains "$TD/.cursor/rules/services.mdc" "globs:" "services rule has globs"
  assert_contains "$TD/.cursor/rules/client.mdc" "alwaysApply: false" "client rule is conditional"
  assert_contains "$TD/.cursor/rules/client.mdc" "globs:" "client rule has globs"
  assert_contains "$TD/.cursor/rules/infra.mdc" "alwaysApply: false" "infra rule is conditional"
  assert_contains "$TD/.cursor/rules/infra.mdc" "globs:" "infra rule has globs"

  cd / && rm -rf "$TD"
}

# ── Test: Claude agent frontmatter ────────────────────────────────────────

test_claude_agent_frontmatter() {
  printf "\n${BOLD}Test: Claude agents have YAML frontmatter${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --claude > /dev/null 2>&1

  assert_contains "$TD/.claude/agents/root.md" "name: root" "root agent has name"
  assert_contains "$TD/.claude/agents/root.md" "model: inherit" "root agent has model"
  assert_contains "$TD/.claude/agents/root.md" "tools:" "root agent has tools"

  cd / && rm -rf "$TD"
}

# ── Test: Codex TOML agents ──────────────────────────────────────────────

test_codex_toml() {
  printf "\n${BOLD}Test: Codex agents are valid TOML${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --codex > /dev/null 2>&1

  assert_contains "$TD/.codex/agents/root.toml" 'name = "root"' "Codex root has name"
  assert_contains "$TD/.codex/agents/root.toml" "developer_instructions" "Codex root has instructions"

  cd / && rm -rf "$TD"
}

# ── Test: Gemini agents have frontmatter ──────────────────────────────────

test_gemini_agents() {
  printf "\n${BOLD}Test: Gemini agents have frontmatter${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --gemini > /dev/null 2>&1

  assert_contains "$TD/.gemini/agents/root.md" "name: root" "Gemini root agent name"
  assert_contains "$TD/.gemini/agents/root.md" "temperature: 0.3" "Gemini root agent temperature"
  assert_contains "$TD/.gemini/agents/root.md" "max_turns: 20" "Gemini root agent max_turns"

  cd / && rm -rf "$TD"
}

# ── Test: _example files are skipped ──────────────────────────────────────

test_example_skipped() {
  printf "\n${BOLD}Test: _example files are excluded${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --all > /dev/null 2>&1

  assert_missing "$TD/.claude/skills/_example" "_example skill not in Claude"
  assert_missing "$TD/.cursor/skills/_example" "_example skill not in Cursor"
  assert_missing "$TD/.claude/rules/_example.md" "_example rule not in Claude"
  assert_missing "$TD/.claude/agents/_example.md" "_example agent not in Claude"

  cd / && rm -rf "$TD"
}

# ── Test: Copilot is NOT generated ────────────────────────────────────────

test_no_copilot() {
  printf "\n${BOLD}Test: Copilot files are not generated${RESET}\n"
  TD="$(create_test_repo)"; cd "$TD"
  bash "$TD/.ai/setup.sh" --all > /dev/null 2>&1

  assert_missing "$TD/.github/copilot-instructions.md" "Copilot instructions not created"

  cd / && rm -rf "$TD"
}

# ── Run ────────────────────────────────────────────────────────────────────

printf "${BOLD}Running .ai/setup.sh tests...${RESET}\n"

test_all
test_gemini_compacted
test_new_skill_distributed
test_new_rule_distributed
test_dry_run
test_idempotency
test_cursor_frontmatter
test_claude_agent_frontmatter
test_codex_toml
test_gemini_agents
test_example_skipped
test_no_copilot

printf "\n${BOLD}Results: %d total, ${GREEN}%d passed${RESET}, ${RED}%d failed${RESET}\n" "$TOTAL" "$PASS" "$FAIL"
[[ $FAIL -gt 0 ]] && exit 1 || { printf "${GREEN}All tests passed.${RESET}\n"; exit 0; }
