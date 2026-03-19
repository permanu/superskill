#!/usr/bin/env bash
# Bootstrap hook for AI tool session start.
# Injects project context from the Obsidian vault into the session.
# Used by: Claude Code (SessionStart), OpenCode (session.created), Codex (skill)
#
# Usage: bootstrap.sh [--tool claude-code|opencode|codex]

set -euo pipefail

VAULT_PATH="${VAULT_PATH:-$HOME/Vaults/ai}"
export VAULT_PATH

CLI="node $HOME/tools/obsidian-kb/dist/cli.js"
TOOL="${1:---tool}"
TOOL_NAME="${2:-unknown}"

# Parse --tool flag
if [[ "$TOOL" == "--tool" ]] && [[ -n "$TOOL_NAME" ]]; then
  TOOL="$TOOL_NAME"
else
  TOOL="unknown"
fi

# 1. Get project context (auto-detected from cwd)
CONTEXT=$($CLI context --detail summary 2>/dev/null || echo "")

# 2. Get active blockers
BLOCKERS=$($CLI todo list --blockers-only 2>/dev/null || echo "")

# 3. Register this session (suppress output)
$CLI session register --tool "$TOOL" >/dev/null 2>&1 || true

# 4. Get resume context (interrupted sessions, recent work, next steps)
RESUME=$($CLI resume 2>/dev/null || echo "")

# 5. Output context to stdout (tool injects as additionalContext)
if [[ -n "$CONTEXT" ]]; then
  echo "## Knowledge Base Context"
  echo ""
  echo "$CONTEXT"
fi

if [[ -n "$BLOCKERS" ]]; then
  echo ""
  echo "## Active Blockers"
  echo "$BLOCKERS"
fi

if [[ -n "$RESUME" ]]; then
  echo ""
  echo "$RESUME"
fi

# 6. Learning count
LEARN_COUNT=$($CLI learn list 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).learnings?.length??0)}catch{console.log(0)}})" 2>/dev/null || echo "0")
if [[ "$LEARN_COUNT" != "0" ]]; then
  echo ""
  echo "## Learnings: $LEARN_COUNT available (use vault_learn list)"
fi

# 7. Available vault tools reminder
echo ""
echo "## Available Vault Tools"
echo "vault_project_context, vault_task, vault_learn, vault_decide, vault_brainstorm, vault_search, vault_resume, vault_prune, vault_stats, vault_deprecate"
