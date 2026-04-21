#!/usr/bin/env bash
set -euo pipefail

# ── .ai/setup.test.sh ──────────────────────────────────────────────────────
# Automated tests for setup.sh.
# Creates a temporary copy of the repo structure, runs setup.sh with each
# flag, and verifies the expected output files.
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_SH="$SCRIPT_DIR/setup.sh"

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_COUNT=0

# ── Helpers ─────────────────────────────────────────────────────────────────

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  printf "  ${GREEN}PASS${RESET}  %s\n" "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  printf "  ${RED}FAIL${RESET}  %s\n" "$1"
}

assert_file_exists() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -f "$path" ]]; then
    pass "$label exists"
  else
    fail "$label does not exist: $path"
  fi
}

assert_file_not_empty() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -s "$path" ]]; then
    pass "$label is not empty"
  else
    fail "$label is empty or missing: $path"
  fi
}

assert_symlink_exists() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -L "$path" ]]; then
    pass "$label is a symlink"
  else
    fail "$label is not a symlink: $path"
  fi
}

assert_symlink_target() {
  local link="$1"
  local expected_target="$2"
  local label="${3:-$link}"
  if [[ -L "$link" ]]; then
    local actual
    actual="$(readlink "$link")"
    if [[ "$actual" == "$expected_target" ]]; then
      pass "$label points to correct target"
    else
      fail "$label points to $actual (expected $expected_target)"
    fi
  else
    fail "$label is not a symlink"
  fi
}

assert_file_contains() {
  local path="$1"
  local pattern="$2"
  local label="${3:-$path contains '$pattern'}"
  if [[ -f "$path" ]] && grep -q "$pattern" "$path"; then
    pass "$label"
  else
    fail "$label"
  fi
}

# ── Setup temp directory ────────────────────────────────────────────────────

create_test_repo() {
  local tmp
  tmp="$(mktemp -d)"

  # Copy .ai/ directory
  cp -R "$SCRIPT_DIR" "$tmp/.ai"

  # Create minimal directory structure expected by setup.sh
  mkdir -p "$tmp/services"
  mkdir -p "$tmp/packages"
  mkdir -p "$tmp/client/main"
  mkdir -p "$tmp/infra"
  mkdir -p "$tmp/.claude"

  # Create a sample SKILL.md to test skill sync
  mkdir -p "$tmp/.ai/skills/sample"
  cat > "$tmp/.ai/skills/sample/SKILL.md" << 'SKILL_EOF'
---
name: sample-skill
scope: services
auto_invoke: true
description: A sample skill for testing
---

# Sample Skill

This is a test skill.
SKILL_EOF

  echo "$tmp"
}

cleanup() {
  if [[ -n "${TEST_DIR:-}" && -d "$TEST_DIR" ]]; then
    rm -rf "$TEST_DIR"
  fi
}

trap cleanup EXIT

# ── Test suites ─────────────────────────────────────────────────────────────

test_all_flag() {
  printf "\n${BOLD}Test: --all flag${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --all > /dev/null 2>&1

  # Root AGENTS.md
  assert_file_exists "$TEST_DIR/AGENTS.md" "Root AGENTS.md"
  assert_file_not_empty "$TEST_DIR/AGENTS.md" "Root AGENTS.md"

  # Domain AGENTS.md files
  assert_file_exists "$TEST_DIR/services/AGENTS.md" "services/AGENTS.md"
  assert_file_not_empty "$TEST_DIR/services/AGENTS.md" "services/AGENTS.md"
  assert_file_exists "$TEST_DIR/packages/AGENTS.md" "packages/AGENTS.md"
  assert_file_not_empty "$TEST_DIR/packages/AGENTS.md" "packages/AGENTS.md"
  assert_file_exists "$TEST_DIR/client/main/AGENTS.md" "client/main/AGENTS.md"
  assert_file_not_empty "$TEST_DIR/client/main/AGENTS.md" "client/main/AGENTS.md"
  assert_file_exists "$TEST_DIR/infra/AGENTS.md" "infra/AGENTS.md"
  assert_file_not_empty "$TEST_DIR/infra/AGENTS.md" "infra/AGENTS.md"

  # Claude: individual skill symlinks inside .claude/skills/
  assert_symlink_exists "$TEST_DIR/.claude/skills/sample" "Claude skills/sample symlink"
  assert_symlink_target "$TEST_DIR/.claude/skills/sample" "$TEST_DIR/.ai/skills/sample/" "Claude skills/sample"

  # Codex: symlink
  assert_symlink_exists "$TEST_DIR/.codex/skills" "Codex skills symlink"
  assert_symlink_target "$TEST_DIR/.codex/skills" "$TEST_DIR/.ai/skills" "Codex skills"

  # Copilot: generated file
  assert_file_exists "$TEST_DIR/.github/copilot-instructions.md" "Copilot instructions"
  assert_file_not_empty "$TEST_DIR/.github/copilot-instructions.md" "Copilot instructions"

  # Cursor: generated file
  assert_file_exists "$TEST_DIR/.cursor/rules/ai-rules.mdc" "Cursor rules"
  assert_file_not_empty "$TEST_DIR/.cursor/rules/ai-rules.mdc" "Cursor rules"

  # Gemini: generated file
  assert_file_exists "$TEST_DIR/GEMINI.md" "GEMINI.md"
  assert_file_not_empty "$TEST_DIR/GEMINI.md" "GEMINI.md"

  rm -rf "$TEST_DIR"
}

test_claude_flag() {
  printf "\n${BOLD}Test: --claude flag${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --claude > /dev/null 2>&1

  assert_symlink_exists "$TEST_DIR/.claude/skills/sample" "Claude skills/sample symlink"
  assert_symlink_target "$TEST_DIR/.claude/skills/sample" "$TEST_DIR/.ai/skills/sample/" "Claude skills/sample"

  # AGENTS.md should still be generated (always runs)
  assert_file_exists "$TEST_DIR/AGENTS.md" "Root AGENTS.md"

  # Codex should NOT be created
  if [[ ! -e "$TEST_DIR/.codex" ]]; then
    pass "Codex directory not created when --claude only"
  else
    fail "Codex directory should not exist with --claude only"
  fi

  rm -rf "$TEST_DIR"
}

test_codex_flag() {
  printf "\n${BOLD}Test: --codex flag${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --codex > /dev/null 2>&1

  assert_symlink_exists "$TEST_DIR/.codex/skills" "Codex skills symlink"
  assert_symlink_target "$TEST_DIR/.codex/skills" "$TEST_DIR/.ai/skills" "Codex skills"

  rm -rf "$TEST_DIR"
}

test_cursor_flag() {
  printf "\n${BOLD}Test: --cursor flag${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --cursor > /dev/null 2>&1

  assert_file_exists "$TEST_DIR/.cursor/rules/ai-rules.mdc" "Cursor rules"
  assert_file_not_empty "$TEST_DIR/.cursor/rules/ai-rules.mdc" "Cursor rules"
  assert_file_contains "$TEST_DIR/.cursor/rules/ai-rules.mdc" "description:" "Cursor rules frontmatter"

  rm -rf "$TEST_DIR"
}

test_copilot_flag() {
  printf "\n${BOLD}Test: --copilot flag${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --copilot > /dev/null 2>&1

  assert_file_exists "$TEST_DIR/.github/copilot-instructions.md" "Copilot instructions"
  assert_file_not_empty "$TEST_DIR/.github/copilot-instructions.md" "Copilot instructions"
  assert_file_contains "$TEST_DIR/.github/copilot-instructions.md" "Generated by .ai/setup.sh" "Copilot header comment"

  rm -rf "$TEST_DIR"
}

test_gemini_flag() {
  printf "\n${BOLD}Test: --gemini flag${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --gemini > /dev/null 2>&1

  assert_file_exists "$TEST_DIR/GEMINI.md" "GEMINI.md"
  assert_file_not_empty "$TEST_DIR/GEMINI.md" "GEMINI.md"
  assert_file_contains "$TEST_DIR/GEMINI.md" "Generated by .ai/setup.sh" "Gemini header comment"

  rm -rf "$TEST_DIR"
}

test_dry_run() {
  printf "\n${BOLD}Test: --dry-run flag${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --all --dry-run > /dev/null 2>&1

  # No files should be created
  if [[ ! -f "$TEST_DIR/GEMINI.md" ]]; then
    pass "GEMINI.md not created in dry-run"
  else
    fail "GEMINI.md should not exist in dry-run"
  fi

  if [[ ! -f "$TEST_DIR/.github/copilot-instructions.md" ]]; then
    pass "Copilot instructions not created in dry-run"
  else
    fail "Copilot instructions should not exist in dry-run"
  fi

  if [[ ! -L "$TEST_DIR/.claude/skills/sample" ]]; then
    pass "Claude skill symlink not created in dry-run"
  else
    fail "Claude skill symlink should not exist in dry-run"
  fi

  rm -rf "$TEST_DIR"
}

test_idempotency() {
  printf "\n${BOLD}Test: idempotency (run twice)${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --all > /dev/null 2>&1
  local first_checksum
  first_checksum="$(cat "$TEST_DIR/AGENTS.md" | md5 2>/dev/null || md5sum "$TEST_DIR/AGENTS.md" | cut -d' ' -f1)"

  bash "$TEST_DIR/.ai/setup.sh" --all > /dev/null 2>&1
  local second_checksum
  second_checksum="$(cat "$TEST_DIR/AGENTS.md" | md5 2>/dev/null || md5sum "$TEST_DIR/AGENTS.md" | cut -d' ' -f1)"

  if [[ "$first_checksum" == "$second_checksum" ]]; then
    pass "AGENTS.md identical after second run"
  else
    fail "AGENTS.md differs after second run"
  fi

  # Symlinks should still work
  assert_symlink_exists "$TEST_DIR/.claude/skills/sample" "Claude skill symlink after second run"

  rm -rf "$TEST_DIR"
}

test_skill_sync() {
  printf "\n${BOLD}Test: skill sync (auto-invoke table)${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --all > /dev/null 2>&1

  assert_file_contains "$TEST_DIR/services/AGENTS.md" "Auto-invoke Skills" "services/AGENTS.md has skill table"
  assert_file_contains "$TEST_DIR/services/AGENTS.md" "sample-skill" "services/AGENTS.md lists sample-skill"

  rm -rf "$TEST_DIR"
}

test_content_merge() {
  printf "\n${BOLD}Test: content merging${RESET}\n"

  TEST_DIR="$(create_test_repo)"
  cd "$TEST_DIR"

  bash "$TEST_DIR/.ai/setup.sh" --copilot --gemini > /dev/null 2>&1

  # Both should contain global rules content
  assert_file_contains "$TEST_DIR/.github/copilot-instructions.md" "pnpm monorepo" "Copilot has global rules"
  assert_file_contains "$TEST_DIR/.github/copilot-instructions.md" "Module Map" "Copilot has agent router"
  assert_file_contains "$TEST_DIR/GEMINI.md" "pnpm monorepo" "Gemini has global rules"
  assert_file_contains "$TEST_DIR/GEMINI.md" "Module Map" "Gemini has agent router"

  rm -rf "$TEST_DIR"
}

# ── Run all tests ───────────────────────────────────────────────────────────

printf "${BOLD}Running .ai/setup.sh tests...${RESET}\n"

test_all_flag
test_claude_flag
test_codex_flag
test_cursor_flag
test_copilot_flag
test_gemini_flag
test_dry_run
test_idempotency
test_skill_sync
test_content_merge

# ── Report ──────────────────────────────────────────────────────────────────

printf "\n${BOLD}Results: %d total, ${GREEN}%d passed${RESET}, ${RED}%d failed${RESET}\n" \
  "$TOTAL_COUNT" "$PASS_COUNT" "$FAIL_COUNT"

if [[ $FAIL_COUNT -gt 0 ]]; then
  printf "\n${RED}Some tests failed.${RESET}\n"
  exit 1
else
  printf "\n${GREEN}All tests passed.${RESET}\n"
  exit 0
fi
