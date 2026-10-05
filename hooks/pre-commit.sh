#!/usr/bin/env bash
# SuperSkill pre-commit hint.
#
# Runs `superskill-cli gate check --ci "$SUPERSKILL_GATE_TARGET"` when the
# target is set and the CLI and gate command are both available. Without a
# target the hook exits 0 silently. Optional and non-breaking: a missing
# target, CLI, or gate command never blocks a commit; an explicit gate
# failure exits non-zero so the commit is blocked by the gate itself.
#
# Install (optional, from the repository root):
#   ln -sf ../../hooks/pre-commit.sh .git/hooks/pre-commit
#
# Bypass once with `git commit --no-verify`; disable permanently by removing the
# symlink. Set SUPERSKILL_GATE=off to keep the hook installed but skip the check.
#
# Environment:
#   SUPERSKILL_GATE_TARGET  spec or ticket ref to gate (unset = skip silently)
#   SUPERSKILL_CLI          CLI command to invoke (default: superskill-cli)
#   SUPERSKILL_GATE         set to "off" to skip the gate check

set -u

if [[ "${SUPERSKILL_GATE:-on}" == "off" ]]; then
  exit 0
fi

if [[ -z "${SUPERSKILL_GATE_TARGET:-}" ]]; then
  exit 0
fi

CLI="${SUPERSKILL_CLI:-superskill-cli}"

if ! command -v "$CLI" >/dev/null 2>&1; then
  echo "superskill pre-commit: $CLI not found; install it or set SUPERSKILL_CLI to enable gate checks." >&2
  exit 0
fi

if ! "$CLI" --help 2>&1 | grep -q "gate"; then
  echo "superskill pre-commit: installed CLI has no 'gate check' command yet; skipping." >&2
  exit 0
fi

exec "$CLI" gate check --ci "$SUPERSKILL_GATE_TARGET"
