# Harness Integration

How superskill injects its minimal rules into every coding harness, and how the
enforcement surfaces are wired. All integration is optional and non-breaking: a
missing constitution, CLI, or gate command never blocks a session or a commit.

## Constitution

`catalog/constitution.md` holds the T0 axioms — 14 items, under 400 tokens, always
injected. Each item names the mechanism that enforces it (gate check, rules
validator, security scanner, router, loader, review).

The rules validator rejects rules that contradict the constitution's non-negotiables
(placeholder tokens, missing sources, unverified status). The gate commands consume
`gate check` evidence; the constitution only states the rule. The token budget and
stable IDs are enforced by `tests/constitution.test.ts`.

## Bootstrap blurb

`superskill-cli setup` writes a short instruction block into each detected client's
instruction file (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, Cursor `.mdc`, OpenCode
instructions file). The block is delimited by `<!-- superskill:start -->` /
`<!-- superskill:end -->` markers and is idempotent.

`superskill-cli skill init` appends the same minimal rules to an existing
`AGENTS.md` / `CLAUDE.md` under the `## SuperSkill` heading, and skips files that
already contain that heading.

The injected text states four things:

1. call the `superskill` tool with the task;
2. no "done" without `gate check` evidence;
3. only verified rules are injected by default;
4. the constitution lives at `catalog/constitution.md` and always applies.

## Hooks

### Session start

`hooks/session-start.sh` reads `catalog/constitution.md` and emits it as session
context. It exits 0 with no output when the file is missing, so it is safe to wire
into any harness.

```bash
hooks/session-start.sh                 # markdown on stdout
hooks/session-start.sh --claude-code   # Claude Code SessionStart JSON
```

Claude Code: copy `hooks/claude-settings.example.json` into `.claude/settings.json`
(or merge its `hooks` key). When the hook lives in this repository, use the example
path `$CLAUDE_PROJECT_DIR/hooks/session-start.sh`; when it comes from the installed
package, use
`$CLAUDE_PROJECT_DIR/node_modules/superskill/hooks/session-start.sh`.

Other harnesses (OpenCode, Codex, generic shells) can run the script at session
start and inject stdout as additional context.

### Pre-commit

`hooks/pre-commit.sh` runs `superskill-cli gate check --ci "$SUPERSKILL_GATE_TARGET"`
only when `SUPERSKILL_GATE_TARGET` is set and both the CLI and the `gate`
command exist. Without a target it exits 0 silently; a missing CLI or gate
command prints a hint and exits 0.

```bash
ln -sf ../../hooks/pre-commit.sh .git/hooks/pre-commit
export SUPERSKILL_GATE_TARGET=001   # spec ref or ticket id; unset = skip
```

- `git commit --no-verify` bypasses the hook for one commit.
- `SUPERSKILL_GATE=off` keeps the hook installed but skips the check.
- `SUPERSKILL_GATE_TARGET=<spec|ticket>` is required for the gate to run; without
  it the hook is a silent no-op, so the hook can be installed repo-wide safely.
- `SUPERSKILL_CLI=/path/to/superskill-cli` overrides the CLI command.

## CI

`.github/workflows/ci.yml` runs the `rules` job on every push and pull request:
build, then `node dist/rules/cli.js validate`, failing on validator errors. Missing
language toolchains degrade to warnings, so the job needs only Node.

## Local checks

```bash
npm run lint              # tsc --noEmit
npm run test              # vitest
npm run build             # tsc
npm run validate:rules    # node dist/rules/cli.js validate
```
