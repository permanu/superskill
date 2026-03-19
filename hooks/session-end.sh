#!/usr/bin/env bash
# Session end hook for AI tools.
# Marks the session as completed in the coordination registry.
# Used by: Claude Code (Stop), OpenCode (session.deleted)
#
# Usage: session-end.sh [--tool claude-code|opencode|codex] [--session-id <id>]

set -euo pipefail

VAULT_PATH="${VAULT_PATH:-$HOME/Vaults/ai}"
export VAULT_PATH

CLI="node $HOME/tools/obsidian-kb/dist/cli.js"

TOOL="${1:---tool}"
TOOL_NAME="${2:-unknown}"
SESSION_ID="${3:-}"

if [[ "$TOOL" == "--tool" ]] && [[ -n "$TOOL_NAME" ]]; then
  TOOL="$TOOL_NAME"
fi

SESSION_ID_FILE="/tmp/obsidian-kb-session-${TOOL_NAME:-unknown}-$$"

if [[ -z "$SESSION_ID" ]] && [[ -f "$SESSION_ID_FILE" ]]; then
  SESSION_ID=$(cat "$SESSION_ID_FILE")
  rm -f "$SESSION_ID_FILE"
fi

if [[ -n "$SESSION_ID" ]]; then
  $CLI session complete "$SESSION_ID" --tool "$TOOL" >/dev/null 2>&1 || true
else
  echo "Session ended. No session ID found — use 'obsidian-kb session complete <id>' to mark complete."
fi
