# Configuration

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_PATH` | `~/Vaults/ai` | Knowledge vault. Must resolve under `$HOME`. |
| `MAX_INJECT_TOKENS` | `1500` | Max tokens for context injection (clamped 100–50000). |
| `SESSION_TTL_HOURS` | `2` | Session heartbeat TTL (clamped 1–168). |
| `SUPERSKILL_TELEMETRY` | unset | `0` disables recording; `1` opts in unless `telemetry disable` has persisted an opt-out. |
| `SUPERSKILL_MAX_RESPONSE_BYTES` | `65536` | MCP response byte budget, capped at 10 MiB; oversized results use a valid JSON `{truncated, bytes, preview}` envelope. Budgets smaller than the empty envelope reserve its minimum overhead. |
| `SUPERSKILL_PRETTY` | unset | `1` pretty-prints MCP JSON responses (compact by default). |
| `SUPERSKILL_CACHE_ROOT` | platform cache dir | Root for shared worktree caches (default `~/Library/Caches/superskill` on macOS, `~/.cache/superskill` on Linux, `%LOCALAPPDATA%\superskill` on Windows). |
| `SUPERSKILL_WORKTREE_BOOTSTRAP` | unset | `0` makes `worktree bootstrap` a no-op, disabling post-checkout seeding for that process. |
| `SUPERSKILL_RUST_HARNESS_DIR` | `~/.superskill/cache/rust-harness` | Warm cargo fixture used by the rules compile harness. |
| `SUPERSKILL_JAVA_JAR_CACHE` | `~/.superskill/cache/jars` | JUnit/JMH jars used by the Java compile harness. |

Section-specific variables live with their features: worktree cache tuning in [worktrees](worktrees.md), hygiene thresholds in [space hygiene](hygiene.md), and watchdog trace roots in [watchdog](watchdog.md).

## Harness hooks

Both hooks are optional and non-breaking: a missing constitution, CLI, or gate command never blocks a session or commit.

- **Session start** — `hooks/session-start.sh` reads `catalog/constitution.md` and emits it as session context. `hooks/session-start.sh --claude-code` prints the Claude Code SessionStart JSON; copy `hooks/claude-settings.example.json` into `.claude/settings.json` to wire it up. Other harnesses can run the script and inject stdout.
- **Pre-commit** — `hooks/pre-commit.sh` runs `gate check --ci "$SUPERSKILL_GATE_TARGET"` only when `SUPERSKILL_GATE_TARGET` is set and both the CLI and `gate` command exist; without a target it exits 0 silently. `git commit --no-verify` bypasses it once, `SUPERSKILL_GATE=off` keeps it installed but skips the check, and `SUPERSKILL_CLI` overrides the CLI command.
- **CI** — `.github/workflows/ci.yml` runs a fast schema-only `validate --no-compile`, then a per-language toolchain matrix (`validate --lang <lang> --strict`) that compiles every Bad/Good snippet with the real compiler. `--strict` fails a job instead of silently skipping when a toolchain is missing.

Details and installation snippets: [harness integration](harness.md).

## Releases

npm publish is **manual** (`npm publish` on a maintainer machine). CI does not ship tokens.
