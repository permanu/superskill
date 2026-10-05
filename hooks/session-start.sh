#!/usr/bin/env bash
# SuperSkill session-start hook.
#
# Injects catalog/constitution.md (the always-on T0 axioms) as session context.
# Optional and non-breaking: if the constitution cannot be found, the hook exits 0
# without output so the harness continues normally.
#
# Usage:
#   hooks/session-start.sh                 # print the constitution as markdown
#   hooks/session-start.sh --claude-code   # print Claude Code SessionStart JSON
#
# Environment:
#   SUPERSKILL_ROOT  superskill package root (default: parent of this script)

set -u

MODE="markdown"
if [[ "${1:-}" == "--claude-code" ]]; then
  MODE="claude-code"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${SUPERSKILL_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

CONSTITUTION=""
for candidate in "$ROOT/catalog/constitution.md" "$SCRIPT_DIR/constitution.md"; do
  if [[ -f "$candidate" ]]; then
    CONSTITUTION="$candidate"
    break
  fi
done

if [[ -z "$CONSTITUTION" ]]; then
  if [[ "$MODE" == "claude-code" ]]; then
    echo '{}'
  fi
  exit 0
fi

if [[ "$MODE" == "claude-code" ]]; then
  # Claude Code SessionStart hook: JSON on stdout, context in hookSpecificOutput.
  node -e '
    const fs = require("fs");
    const text = fs.readFileSync(process.argv[1], "utf8");
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text }
    }));
  ' "$CONSTITUTION"
else
  cat "$CONSTITUTION"
fi
