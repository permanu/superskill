#!/usr/bin/env bash
# Session end hook for AI tools.
# Marks the session as completed in the coordination registry.
# Used by: Claude Code (Stop), OpenCode (session.deleted)
#
# Usage: session-end.sh [--tool claude-code|opencode|codex]

set -euo pipefail

VAULT_PATH="${VAULT_PATH:-$HOME/Vaults/ai}"
export VAULT_PATH

CLI="node $HOME/tools/obsidian-kb/dist/cli.js"

# Find session ID for this tool from active sessions
# For now, just list - full session tracking requires storing the session ID
# from bootstrap.sh (future improvement: store in /tmp/obsidian-kb-session-id)
echo "Session ended. Use 'obsidian-kb session complete <id>' to mark complete."
