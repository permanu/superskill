#!/usr/bin/env bash
# SuperSkill pre-commit hint.
#
# Runs `superskill-cli gate check --ci` when the CLI and the gate command are both
# available. Optional and non-breaking: when either is missing the hook exits 0 with
# a hint, so commits are never blocked by a missing tool.
#
# Install (optional, from the repository root):
#   ln -sf ../../hooks/pre-commit.sh .git/hooks/pre-commit
#
# Bypass once with `git commit --no-verify`; disable permanently by removing the
# symlink. Set SUPERSKILL_GATE=off to keep the hook installed but skip the check.
#
# Environment:
#   SUPERSKILL_CLI   CLI command to invoke (default: superskill-cli)
#   SUPERSKILL_GATE  set to "off" to skip the gate check

set -u

if [[ "${SUPERSKILL_GATE:-on}" == "off" ]]; then
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

exec "$CLI" gate check --ci
