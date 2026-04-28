#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ "$(basename "$SCRIPT_DIR")" == ".ai" ]] && ROOT="$(dirname "$SCRIPT_DIR")" || ROOT="$SCRIPT_DIR"

AI_DIR="$ROOT/.ai"; RULES_DIR="$AI_DIR/rules"; AGENTS_DIR="$AI_DIR/agents"; SKILLS_DIR="$AI_DIR/skills"
GENERATED=0; SYMLINKED=0; SKIPPED=0; ERRORS=0
DO_CLAUDE=false; DO_CODEX=false; DO_CURSOR=false; DO_GEMINI=false; DRY_RUN=false

info()   { printf "${BLUE}[INFO]${RESET}  %s\n" "$*"; }
ok()     { printf "${GREEN}[OK]${RESET}    %s\n" "$*"; }
warn()   { printf "${YELLOW}[WARN]${RESET}  %s\n" "$*"; }
err()    { printf "${RED}[ERR]${RESET}   %s\n" "$*"; ERRORS=$((ERRORS + 1)); }
header() { printf "\n${BOLD}${CYAN}── %s ──${RESET}\n" "$*"; }

write_file() {
  local path="$1" content="$2"
  if $DRY_RUN; then info "[dry-run] Would write: $path"; SKIPPED=$((SKIPPED+1)); return; fi
  mkdir -p "$(dirname "$path")"; printf '%s\n' "$content" > "$path"; ok "Wrote: $path"; GENERATED=$((GENERATED+1))
}

create_symlink() {
  local target="$1" link="$2"
  if $DRY_RUN; then info "[dry-run] Would symlink: $link -> $target"; SKIPPED=$((SKIPPED+1)); return; fi
  mkdir -p "$(dirname "$link")"
  [[ -L "$link" ]] && rm "$link"
  [[ -e "$link" ]] && rm -rf "$link"
  ln -s "$target" "$link"; ok "Symlinked: $link -> $target"; SYMLINKED=$((SYMLINKED+1))
}

copy_file() {
  local src="$1" dst="$2"
  if $DRY_RUN; then info "[dry-run] Would copy: $src -> $dst"; SKIPPED=$((SKIPPED+1)); return; fi
  mkdir -p "$(dirname "$dst")"; cp "$src" "$dst"; ok "Copied: $dst"; GENERATED=$((GENERATED+1))
}

read_file() { [[ -f "$1" ]] && cat "$1" || { warn "Not found: $1"; echo ""; }; }

# ── Skill table ────────────────────────────────────────────────────────────
skill_table_for_scope() {
  local scope="$1" rows=""
  [[ ! -d "$SKILLS_DIR" ]] && echo "" && return
  while IFS= read -r -d '' sf; do
    local name="" sscope="" ainvoke="" desc="" infm=false imeta=false idesc=false
    while IFS= read -r line; do
      [[ "$line" == "---" ]] && { $infm && break || { infm=true; continue; }; }
      if $infm; then
        [[ "$line" == "metadata:" ]] && { imeta=true; idesc=false; continue; }
        $imeta && [[ "$line" != "  "* && "$line" != "" ]] && imeta=false
        if $idesc; then [[ "$line" == "  "* && -z "$desc" ]] && desc="$(echo "$line"|xargs)"; [[ "$line" != "  "* && "$line" != "" ]] && idesc=false || continue; fi
        case "$line" in name:*) name="$(echo "${line#name:}"|xargs)";; description:*) local dv; dv="$(echo "${line#description:}"|xargs)"; [[ "$dv" == "|" || "$dv" == ">" ]] && idesc=true || desc="$dv";; esac
        if $imeta; then local t; t="$(echo "$line"|sed 's/^[[:space:]]*//')"; case "$t" in scope:*) sscope="$(echo "${t#scope:}"|xargs|tr -d '[]')";; auto_invoke:*) ainvoke="$(echo "${t#auto_invoke:}"|xargs|tr -d "'\"")" ;; esac; fi
      fi
    done < "$sf"
    local matched=false; IFS=', ' read -ra ss <<< "$sscope"
    for s in "${ss[@]}"; do [[ "$(echo "$s"|xargs)" == "$scope" ]] && { matched=true; break; }; done
    $matched && rows="${rows}| ${name:-unknown} | ${ainvoke:-N/A} | ${desc:-} | \`${sf#"$ROOT"/}\` |\n"
  done < <(find "$SKILLS_DIR" -name "SKILL.md" -not -path "*/_example/*" -print0 2>/dev/null)
  echo "$rows"
}

append_skill_table() {
  local content="$1" scope="$2" rows; rows="$(skill_table_for_scope "$scope")"
  [[ -n "$rows" ]] && content="${content}

## Auto-invoke Skills

| Name | Auto-invoke | Description | Path |
|------|-------------|-------------|------|
$(echo -e "$rows")"
  echo "$content"
}

# ── Generate AGENTS.md ─────────────────────────────────────────────────────
generate_agents_md() {
  header "Generating AGENTS.md files"
  local c; c="$(read_file "$AGENTS_DIR/root.md")"; c="$(append_skill_table "$c" "root")"; write_file "$ROOT/AGENTS.md" "$c"
  local -A dm=(["services"]="$ROOT/services/AGENTS.md" ["packages"]="$ROOT/packages/AGENTS.md" ["client"]="$ROOT/client/main/AGENTS.md" ["infra"]="$ROOT/infra/AGENTS.md")
  for d in "${!dm[@]}"; do
    [[ -f "$AGENTS_DIR/${d}.md" ]] || continue
    local c2; c2="$(read_file "$AGENTS_DIR/${d}.md")"; c2="$(append_skill_table "$c2" "$d")"; write_file "${dm[$d]}" "$c2"
  done
}

# ── Claude Code ────────────────────────────────────────────────────────────
setup_claude() {
  header "Claude Code"

  # Rules -> .claude/rules/*.md
  for f in "$RULES_DIR"/*.md; do [[ -f "$f" ]] || continue; local n; n="$(basename "$f")"; [[ "$n" == _* ]] && continue; copy_file "$f" "$ROOT/.claude/rules/$n"; done

  # Agents -> .claude/agents/*.md with YAML frontmatter
  for f in "$AGENTS_DIR"/*.md; do [[ -f "$f" ]] || continue; local n; n="$(basename "$f" .md)"; [[ "$n" == _* ]] && continue
    local agent_content; agent_content="$(read_file "$f")"
    if ! $DRY_RUN; then
      mkdir -p "$ROOT/.claude/agents"
      {
        echo "---"
        echo "name: ${n}"
        echo "description: Agent for ${n} domain. Use when working on ${n} related code."
        echo "model: inherit"
        echo "tools:"
        echo "  - Read"
        echo "  - Edit"
        echo "  - Write"
        echo "  - Glob"
        echo "  - Grep"
        echo "  - Bash"
        echo "---"
        echo ""
        echo "$agent_content"
      } > "$ROOT/.claude/agents/${n}.md"
      ok "Wrote: $ROOT/.claude/agents/${n}.md"; GENERATED=$((GENERATED+1))
    else
      info "[dry-run] Would write: $ROOT/.claude/agents/${n}.md"; SKIPPED=$((SKIPPED+1))
    fi
  done

  # Skills -> .claude/skills/{name} (individual symlinks to coexist with existing skills)
  for d in "$SKILLS_DIR"/*/; do [[ -d "$d" ]] || continue; local n; n="$(basename "$d")"; [[ "$n" == _* ]] && continue; create_symlink "$d" "$ROOT/.claude/skills/$n"; done
}

# ── Codex ──────────────────────────────────────────────────────────────────
setup_codex() {
  header "Codex"

  # Skills -> .agents/skills/{name} (Codex reads from .agents/)
  for d in "$SKILLS_DIR"/*/; do [[ -d "$d" ]] || continue; local n; n="$(basename "$d")"; [[ "$n" == _* ]] && continue; create_symlink "$d" "$ROOT/.agents/skills/$n"; done

  # Agents -> .codex/agents/*.toml
  for f in "$AGENTS_DIR"/*.md; do [[ -f "$f" ]] || continue; local n; n="$(basename "$f" .md)"; [[ "$n" == _* ]] && continue
    local c; c="$(read_file "$f")"
    if ! $DRY_RUN; then
      mkdir -p "$ROOT/.codex/agents"
      local toml_path="$ROOT/.codex/agents/${n}.toml"
      printf 'name = "%s"\ndescription = "Agent for %s domain"\ndeveloper_instructions = """\n%s\n"""\n' "$n" "$n" "$c" > "$toml_path"
      ok "Wrote: $toml_path"; GENERATED=$((GENERATED+1))
    else
      info "[dry-run] Would write: $ROOT/.codex/agents/${n}.toml"; SKIPPED=$((SKIPPED+1))
    fi
  done
}

# ── Cursor ─────────────────────────────────────────────────────────────────
setup_cursor() {
  header "Cursor"

  # Rules -> .cursor/rules/{name}.mdc with frontmatter (alwaysApply + globs)
  for f in "$RULES_DIR"/*.md; do [[ -f "$f" ]] || continue; local n; n="$(basename "$f" .md)"; [[ "$n" == _* ]] && continue
    local c; c="$(read_file "$f")"; local aa="true" gb=""
    [[ "$n" == "client" ]]   && aa="false" && gb=$'\nglobs:\n  - "client/**/*.ts"\n  - "client/**/*.tsx"'
    [[ "$n" == "services" ]] && aa="false" && gb=$'\nglobs:\n  - "services/**/*.ts"'
    [[ "$n" == "packages" ]] && aa="false" && gb=$'\nglobs:\n  - "packages/**/*.ts"'
    [[ "$n" == "infra" ]]    && aa="false" && gb=$'\nglobs:\n  - "infra/**/*.ts"'
    write_file "$ROOT/.cursor/rules/${n}.mdc" "---\ndescription: \"${n} rules\"\nalwaysApply: ${aa}${gb}\n---\n\n<!-- Generated by .ai/setup.sh -->\n\n${c}"
  done

  # Skills -> .cursor/skills/{name} (symlinks)
  for d in "$SKILLS_DIR"/*/; do [[ -d "$d" ]] || continue; local n; n="$(basename "$d")"; [[ "$n" == _* ]] && continue; create_symlink "$d" "$ROOT/.cursor/skills/$n"; done

  # Agents -> .cursor/agents/*.md (copy)
  for f in "$AGENTS_DIR"/*.md; do [[ -f "$f" ]] || continue; local n; n="$(basename "$f")"; [[ "$n" == _* ]] && continue; copy_file "$f" "$ROOT/.cursor/agents/$n"; done
}

# ── Gemini CLI ─────────────────────────────────────────────────────────────
setup_gemini() {
  header "Gemini CLI"

  # GEMINI.md: compact ALL rules + agents + skills into one file
  local content="<!-- Generated by .ai/setup.sh -->"
  content="${content}\n\n$(read_file "$RULES_DIR/global.md")"
  for f in "$RULES_DIR"/*.md; do [[ -f "$f" ]] || continue; local n; n="$(basename "$f" .md)"; [[ "$n" == _* || "$n" == "global" ]] && continue
    content="${content}\n\n---\n\n$(read_file "$f")"
  done
  content="${content}\n\n---\n\n$(read_file "$AGENTS_DIR/root.md")"
  for sf in "$SKILLS_DIR"/*/SKILL.md; do [[ -f "$sf" ]] || continue; [[ "$sf" == */_example/* ]] && continue
    content="${content}\n\n---\n\n$(read_file "$sf")"
  done
  write_file "$ROOT/GEMINI.md" "$content"

  # .gemini/settings.json
  write_file "$ROOT/.gemini/settings.json" '{ "context": { "fileName": ["GEMINI.md", "AGENTS.md"] } }'

  # .gemini/agents/*.md with frontmatter
  for f in "$AGENTS_DIR"/*.md; do [[ -f "$f" ]] || continue; local n; n="$(basename "$f" .md)"; [[ "$n" == _* ]] && continue
    local agent_content; agent_content="$(read_file "$f")"
    if ! $DRY_RUN; then
      mkdir -p "$ROOT/.gemini/agents"
      printf '%s\n' "---" > "$ROOT/.gemini/agents/${n}.md"
      printf 'name: %s\n' "$n" >> "$ROOT/.gemini/agents/${n}.md"
      printf 'description: Agent for %s domain in the financial-management monorepo.\n' "$n" >> "$ROOT/.gemini/agents/${n}.md"
      printf 'tools:\n  - "*"\n' >> "$ROOT/.gemini/agents/${n}.md"
      printf 'temperature: 0.3\n' >> "$ROOT/.gemini/agents/${n}.md"
      printf 'max_turns: 20\n' >> "$ROOT/.gemini/agents/${n}.md"
      printf '%s\n' "---" >> "$ROOT/.gemini/agents/${n}.md"
      printf '\n%s\n' "$agent_content" >> "$ROOT/.gemini/agents/${n}.md"
      ok "Wrote: $ROOT/.gemini/agents/${n}.md"; GENERATED=$((GENERATED+1))
    else
      info "[dry-run] Would write: $ROOT/.gemini/agents/${n}.md"; SKIPPED=$((SKIPPED+1))
    fi
  done
}

# ── Menu & Args ────────────────────────────────────────────────────────────
interactive_menu() {
  printf "\n${BOLD}Which tools?${RESET}\n  1) All  2) Claude  3) Codex  4) Cursor  5) Gemini  0) Cancel\n"
  printf "Enter choices: "; read -r ch; IFS=',' read -ra sel <<< "$ch"
  for c in "${sel[@]}"; do c="$(echo "$c"|xargs)"; case "$c" in 0) exit 0;; 1) DO_CLAUDE=true;DO_CODEX=true;DO_CURSOR=true;DO_GEMINI=true;; 2) DO_CLAUDE=true;; 3) DO_CODEX=true;; 4) DO_CURSOR=true;; 5) DO_GEMINI=true;; esac; done
}

[[ $# -eq 0 ]] && interactive_menu
while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)     DO_CLAUDE=true;DO_CODEX=true;DO_CURSOR=true;DO_GEMINI=true;;
    --claude)  DO_CLAUDE=true;;
    --codex)   DO_CODEX=true;;
    --cursor)  DO_CURSOR=true;;
    --gemini)  DO_GEMINI=true;;
    --dry-run) DRY_RUN=true;;
    --help|-h) echo "Usage: $0 [--all|--claude|--codex|--cursor|--gemini] [--dry-run]"; exit 0;;
    *) err "Unknown: $1"; exit 1;;
  esac; shift
done

[[ ! -d "$AI_DIR" ]] && err ".ai/ not found" && exit 1
! $DO_CLAUDE && ! $DO_CODEX && ! $DO_CURSOR && ! $DO_GEMINI && exit 0
$DRY_RUN && header "DRY RUN"

generate_agents_md
$DO_CLAUDE && setup_claude; $DO_CODEX && setup_codex; $DO_CURSOR && setup_cursor; $DO_GEMINI && setup_gemini

header "Summary"
printf "  Generated: ${GREEN}%d${RESET}  Symlinks: ${GREEN}%d${RESET}" "$GENERATED" "$SYMLINKED"
$DRY_RUN && printf "  Skipped: ${YELLOW}%d${RESET}" "$SKIPPED"
[[ $ERRORS -gt 0 ]] && printf "  Errors: ${RED}%d${RESET}" "$ERRORS"
printf "\n${GREEN}Done.${RESET}\n"
