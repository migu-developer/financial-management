#!/usr/bin/env bash
set -euo pipefail

# ── .ai/setup.sh ────────────────────────────────────────────────────────────
# Distributes AI documentation (rules, agents, skills) to multiple tools.
# Run from the repository root or from .ai/ -- the script auto-detects.
# ─────────────────────────────────────────────────────────────────────────────

# ── Colors ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Resolve repo root ──────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(basename "$SCRIPT_DIR")" == ".ai" ]]; then
  ROOT="$(dirname "$SCRIPT_DIR")"
else
  ROOT="$SCRIPT_DIR"
fi

AI_DIR="$ROOT/.ai"
RULES_DIR="$AI_DIR/rules"
AGENTS_DIR="$AI_DIR/agents"
SKILLS_DIR="$AI_DIR/skills"

# ── Counters ────────────────────────────────────────────────────────────────

GENERATED=0
SYMLINKED=0
SKIPPED=0
ERRORS=0

# ── Flags ───────────────────────────────────────────────────────────────────

DO_CLAUDE=false
DO_CODEX=false
DO_CURSOR=false
DO_COPILOT=false
DO_GEMINI=false
DRY_RUN=false

# ── Helpers ─────────────────────────────────────────────────────────────────

info()    { printf "${BLUE}[INFO]${RESET}  %s\n" "$*"; }
ok()      { printf "${GREEN}[OK]${RESET}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${RESET}  %s\n" "$*"; }
err()     { printf "${RED}[ERR]${RESET}   %s\n" "$*"; ERRORS=$((ERRORS + 1)); }
header()  { printf "\n${BOLD}${CYAN}── %s ──${RESET}\n" "$*"; }

# Write content to a file (respects --dry-run).
write_file() {
  local path="$1"
  local content="$2"
  if $DRY_RUN; then
    info "[dry-run] Would write: $path"
    SKIPPED=$((SKIPPED + 1))
    return
  fi
  mkdir -p "$(dirname "$path")"
  printf '%s\n' "$content" > "$path"
  ok "Wrote: $path"
  GENERATED=$((GENERATED + 1))
}

# Create a symlink (respects --dry-run).
create_symlink() {
  local target="$1"
  local link="$2"
  if $DRY_RUN; then
    info "[dry-run] Would symlink: $link -> $target"
    SKIPPED=$((SKIPPED + 1))
    return
  fi
  mkdir -p "$(dirname "$link")"
  if [[ -L "$link" ]]; then
    rm "$link"
  elif [[ -e "$link" ]]; then
    warn "Removing existing non-symlink: $link"
    rm -rf "$link"
  fi
  ln -s "$target" "$link"
  ok "Symlinked: $link -> $target"
  SYMLINKED=$((SYMLINKED + 1))
}

# Read a file and return its contents.
read_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    cat "$path"
  else
    warn "File not found: $path"
    echo ""
  fi
}

# ── Skill Sync ──────────────────────────────────────────────────────────────

# Scan SKILL.md files and build auto-invoke tables for AGENTS.md.
# Returns a string of markdown table rows for a given scope.
skill_table_for_scope() {
  local scope="$1"
  local rows=""

  if [[ ! -d "$SKILLS_DIR" ]]; then
    echo ""
    return
  fi

  while IFS= read -r -d '' skill_file; do
    local name="" skill_scope="" auto_invoke="" description=""
    local in_frontmatter=false
    local in_metadata=false
    local in_desc_block=false

    while IFS= read -r line; do
      if [[ "$line" == "---" ]]; then
        if $in_frontmatter; then
          break
        else
          in_frontmatter=true
          continue
        fi
      fi
      if $in_frontmatter; then
        # Detect metadata: block (indented keys below it)
        if [[ "$line" == "metadata:" ]]; then
          in_metadata=true
          in_desc_block=false
          continue
        fi
        # Non-indented line exits metadata block
        if $in_metadata && [[ "$line" != "  "* && "$line" != "" ]]; then
          in_metadata=false
        fi
        # Capture first line of description block scalar
        if $in_desc_block; then
          if [[ "$line" == "  "* && -z "$description" ]]; then
            description="$(echo "$line" | xargs)"
          fi
          # Any non-indented line ends the block
          if [[ "$line" != "  "* && "$line" != "" ]]; then
            in_desc_block=false
          else
            continue
          fi
        fi
        # Parse top-level keys
        case "$line" in
          name:*)        name="$(echo "${line#name:}" | xargs)" ;;
          description:*)
            local desc_val
            desc_val="$(echo "${line#description:}" | xargs)"
            if [[ "$desc_val" == "|" || "$desc_val" == ">" ]]; then
              in_desc_block=true
            else
              description="$desc_val"
            fi
            ;;
        esac
        # Parse indented metadata keys (scope, auto_invoke) and top-level fallback
        if $in_metadata; then
          local trimmed
          trimmed="$(echo "$line" | sed 's/^[[:space:]]*//')"
          case "$trimmed" in
            scope:*)       skill_scope="$(echo "${trimmed#scope:}" | xargs | tr -d '[]')" ;;
            auto_invoke:*) auto_invoke="$(echo "${trimmed#auto_invoke:}" | xargs | tr -d "'\"")" ;;
          esac
        else
          case "$line" in
            scope:*)       skill_scope="$(echo "${line#scope:}" | xargs | tr -d '[]')" ;;
            auto_invoke:*) auto_invoke="$(echo "${line#auto_invoke:}" | xargs | tr -d "'\"")" ;;
          esac
        fi
      fi
    done < "$skill_file"

    # Match scope: supports comma-separated scopes (e.g., "services, packages")
    local matched=false
    IFS=', ' read -ra scopes <<< "$skill_scope"
    for s in "${scopes[@]}"; do
      s="$(echo "$s" | xargs)"
      if [[ "$s" == "$scope" ]]; then
        matched=true
        break
      fi
    done

    if $matched; then
      local relative_path="${skill_file#"$ROOT"/}"
      rows="${rows}| ${name:-unknown} | ${auto_invoke:-N/A} | ${description:-} | \`${relative_path}\` |
"
    fi
  done < <(find "$SKILLS_DIR" -name "SKILL.md" -not -path "*/_example/*" -print0 2>/dev/null)

  echo "$rows"
}

# Append auto-invoke table to an AGENTS.md content string.
append_skill_table() {
  local content="$1"
  local scope="$2"
  local rows
  rows="$(skill_table_for_scope "$scope")"

  if [[ -n "$rows" ]]; then
    content="${content}

## Auto-invoke Skills

| Name | Auto-invoke | Description | Path |
|------|-------------|-------------|------|
${rows}"
  fi

  echo "$content"
}

# ── Generate AGENTS.md files ────────────────────────────────────────────────

generate_agents_md() {
  header "Generating AGENTS.md files"

  # Root AGENTS.md
  local root_content
  root_content="$(read_file "$AGENTS_DIR/root.md")"
  root_content="$(append_skill_table "$root_content" "root")"
  write_file "$ROOT/AGENTS.md" "$root_content"

  # Domain AGENTS.md files
  local -A domain_map=(
    ["services"]="$ROOT/services/AGENTS.md"
    ["packages"]="$ROOT/packages/AGENTS.md"
    ["client"]="$ROOT/client/main/AGENTS.md"
    ["infra"]="$ROOT/infra/AGENTS.md"
  )

  for domain in "${!domain_map[@]}"; do
    local agent_file="$AGENTS_DIR/${domain}.md"
    local target="${domain_map[$domain]}"

    if [[ -f "$agent_file" ]]; then
      local content
      content="$(read_file "$agent_file")"
      content="$(append_skill_table "$content" "$domain")"
      write_file "$target" "$content"
    else
      warn "Agent file not found: $agent_file"
    fi
  done
}

# ── Tool-specific generators ────────────────────────────────────────────────

setup_claude() {
  header "Claude Code"
  local claude_skills="$ROOT/.claude/skills"
  mkdir -p "$claude_skills"
  # Symlink each skill individually into .claude/skills/ to coexist with existing skills
  for skill_dir in "$SKILLS_DIR"/*/; do
    [[ -d "$skill_dir" ]] || continue
    local skill_name
    skill_name="$(basename "$skill_dir")"
    # Skip example templates
    [[ "$skill_name" == _example* ]] && continue
    create_symlink "$skill_dir" "$claude_skills/$skill_name"
  done
}

setup_codex() {
  header "Codex"
  local target="$ROOT/.codex/skills"
  create_symlink "$SKILLS_DIR" "$target"
}

setup_copilot() {
  header "Copilot"
  local global_rules
  global_rules="$(read_file "$RULES_DIR/global.md")"
  local root_agents
  root_agents="$(read_file "$AGENTS_DIR/root.md")"

  local content="<!-- Generated by .ai/setup.sh -- do not edit manually -->

${global_rules}

---

${root_agents}"

  write_file "$ROOT/.github/copilot-instructions.md" "$content"
}

setup_cursor() {
  header "Cursor"
  local global_rules
  global_rules="$(read_file "$RULES_DIR/global.md")"

  local content="---
description: AI rules for the financial-management monorepo
globs:
  - \"**/*.ts\"
  - \"**/*.tsx\"
  - \"**/*.js\"
  - \"**/*.jsx\"
---

<!-- Generated by .ai/setup.sh -- do not edit manually -->

${global_rules}"

  write_file "$ROOT/.cursor/rules/ai-rules.mdc" "$content"
}

setup_gemini() {
  header "Gemini CLI"
  local global_rules
  global_rules="$(read_file "$RULES_DIR/global.md")"
  local root_agents
  root_agents="$(read_file "$AGENTS_DIR/root.md")"

  local content="<!-- Generated by .ai/setup.sh -- do not edit manually -->

${global_rules}

---

${root_agents}"

  write_file "$ROOT/GEMINI.md" "$content"
}

# ── Interactive menu ────────────────────────────────────────────────────────

interactive_menu() {
  printf "\n${BOLD}Which tools do you want to set up?${RESET}\n\n"
  printf "  1) All\n"
  printf "  2) Claude Code\n"
  printf "  3) Codex\n"
  printf "  4) Cursor\n"
  printf "  5) Copilot\n"
  printf "  6) Gemini CLI\n"
  printf "  0) Cancel\n\n"
  printf "Enter choices (comma-separated, e.g. 2,4): "
  read -r choices

  IFS=',' read -ra selected <<< "$choices"
  for choice in "${selected[@]}"; do
    choice="$(echo "$choice" | xargs)"
    case "$choice" in
      0) info "Cancelled."; exit 0 ;;
      1) DO_CLAUDE=true; DO_CODEX=true; DO_CURSOR=true; DO_COPILOT=true; DO_GEMINI=true ;;
      2) DO_CLAUDE=true ;;
      3) DO_CODEX=true ;;
      4) DO_CURSOR=true ;;
      5) DO_COPILOT=true ;;
      6) DO_GEMINI=true ;;
      *) warn "Unknown choice: $choice" ;;
    esac
  done
}

# ── Parse arguments ─────────────────────────────────────────────────────────

if [[ $# -eq 0 ]]; then
  interactive_menu
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)     DO_CLAUDE=true; DO_CODEX=true; DO_CURSOR=true; DO_COPILOT=true; DO_GEMINI=true ;;
    --claude)  DO_CLAUDE=true ;;
    --codex)   DO_CODEX=true ;;
    --cursor)  DO_CURSOR=true ;;
    --copilot) DO_COPILOT=true ;;
    --gemini)  DO_GEMINI=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      printf "Usage: %s [--all|--claude|--codex|--cursor|--copilot|--gemini] [--dry-run]\n" "$0"
      printf "\nFlags:\n"
      printf "  --all       Set up all tools\n"
      printf "  --claude    Symlink skills into .claude/skills/\n"
      printf "  --codex     Symlink skills to .codex/skills/\n"
      printf "  --cursor    Generate .cursor/rules/ai-rules.mdc\n"
      printf "  --copilot   Generate .github/copilot-instructions.md\n"
      printf "  --gemini    Generate GEMINI.md\n"
      printf "  --dry-run   Preview changes without writing\n"
      printf "\nIf no flags are given, an interactive menu is shown.\n"
      exit 0
      ;;
    *)
      err "Unknown flag: $1"
      exit 1
      ;;
  esac
  shift
done

# ── Validate ────────────────────────────────────────────────────────────────

if [[ ! -d "$AI_DIR" ]]; then
  err ".ai/ directory not found at: $AI_DIR"
  exit 1
fi

if ! $DO_CLAUDE && ! $DO_CODEX && ! $DO_CURSOR && ! $DO_COPILOT && ! $DO_GEMINI; then
  warn "No tools selected. Nothing to do."
  exit 0
fi

if $DRY_RUN; then
  header "DRY RUN -- no files will be written"
fi

# ── Execute ─────────────────────────────────────────────────────────────────

generate_agents_md

$DO_CLAUDE  && setup_claude
$DO_CODEX   && setup_codex
$DO_COPILOT && setup_copilot
$DO_CURSOR  && setup_cursor
$DO_GEMINI  && setup_gemini

# ── Summary ─────────────────────────────────────────────────────────────────

header "Summary"
printf "  Files generated : ${GREEN}%d${RESET}\n" "$GENERATED"
printf "  Symlinks created: ${GREEN}%d${RESET}\n" "$SYMLINKED"
if $DRY_RUN; then
  printf "  Skipped (dry)   : ${YELLOW}%d${RESET}\n" "$SKIPPED"
fi
if [[ $ERRORS -gt 0 ]]; then
  printf "  Errors          : ${RED}%d${RESET}\n" "$ERRORS"
  exit 1
fi

printf "\n${GREEN}Done.${RESET}\n"
