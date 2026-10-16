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
| `SUPERSKILL_MCP_ALLOWED_TOOLS` | unset | Host-owned JSON array of allowed MCP tool names. `[]` denies all tools; malformed configuration fails startup. Captured at startup; requests cannot widen it. |
| `SUPERSKILL_SKILL_PINS` | unset | Host-owned JSON object mapping non-catalog skill IDs to approved canonical bundle SHA-256 digests. A configured mismatch blocks loading. |
| `SUPERSKILL_REQUIRE_SKILL_PINS` | `0` | `1` blocks non-catalog skills without an approved host pin. Only `0`/`1` are accepted. Unset/default mode permits heuristic-checked local skills with explicit unrecorded/unattested trust metadata. |
| `SUPERSKILL_RETAIN_TASK_TEXT` | `0` | Automatic graph history uses process-keyed opaque task labels by default. `1` explicitly retains task text after credential screening. Invalid values fail closed. |
| `SUPERSKILL_CACHE_ROOT` | platform cache dir | Root for shared worktree caches (default `~/Library/Caches/superskill` on macOS, `~/.cache/superskill` on Linux, `%LOCALAPPDATA%\superskill` on Windows). |
| `SUPERSKILL_WORKTREE_BOOTSTRAP` | unset | `0` makes `worktree bootstrap` a no-op, disabling post-checkout seeding for that process. |
| `SUPERSKILL_RUST_HARNESS_DIR` | `~/.superskill/cache/rust-harness` | Warm cargo fixture used by the rules compile harness. |
| `SUPERSKILL_JAVA_JAR_CACHE` | `~/.superskill/cache/jars` | JUnit/JMH jars used by the Java compile harness. |

Section-specific variables live with their features: worktree cache tuning in [worktrees](worktrees.md), hygiene thresholds in [space hygiene](hygiene.md), and watchdog trace roots in [watchdog](watchdog.md).

## Lazy project-domain routing

SuperSkill remains general purpose. Declare an optional domain in the mapped project's vault context, `projects/<slug>/context.md`:

```yaml
---
routing:
  domains: [banking]
---
```

Only `banking` currently has a domain-specific pack mapping. Other well-formed domain labels are retained as metadata without activating banking guidance. Omitting `routing`, using `domains: []`, or having no context file keeps general-purpose routing. Mentioning banking in prose, examples, past sessions or a sibling project's notes does not classify this project as banking.

Activation and graph `resolve` read only the current project's context through its vault jail. They use the bounded frontmatter, not the body as a prompt; the body is not included in activation output. Metadata is reread each call so changes do not leave a stale domain decision. Invalid metadata or unsafe context access is reported rather than silently disabling domain guidance. Frontmatter must close within 16,384 characters; the existing VaultFS file-size bound still applies.

- A banking project loads banking methodology for relevant work, but skips unrelated spelling/typo and documentation-only tasks. Security/compliance documentation review still qualifies.
- An explicit banking/regulatory task can load the pack in any project. Ordinary ecommerce payments, accounting-ledger work or the word "bank" alone do not imply banking regulation.
- Vault isolation and compact comment/leakage safeguards remain universal. Detailed logging/comment packs stay task-routed.
- Atomic rules remain independently selected by active language, meaningful task terms and discriminative file paths, with verified status and token-budget limits. Domain classification does not bulk-load the language catalog or every financial rule. Accounting software can retrieve a ledger-balancing rule without loading bank-compliance methodology.

## Shared atomic controls

`catalog/rules/shared/` defines language-independent controls once. `lang: shared` is a rule scope, not a ninth programming language. All eight language contexts can retrieve a matching shared control. Language adapters use `related: [shared-<id>]` to reference it; selection follows only those verified shared references one hop, deduplicates them, and counts their content against the same budget. Arbitrary related language rules are not recursively expanded.

Shared examples are concrete `text` scenarios reviewed against primary sources. The validator checks their contract and references, not compilation. `node dist/rules/cli.js validate --lang shared --strict` validates this pack; real language snippets retain their compiler checks. Metadata resolution exposes IDs, sizes and reasons; content is opened or activated only when selected.

## Harness hooks

Both hooks are optional and non-breaking: a missing constitution, CLI, or gate command never blocks a session or commit.

- **Session start** — `hooks/session-start.sh` reads `catalog/constitution.md` and emits it as session context. `hooks/session-start.sh --claude-code` prints the Claude Code SessionStart JSON; copy `hooks/claude-settings.example.json` into `.claude/settings.json` to wire it up. Other harnesses can run the script and inject stdout.
- **Pre-commit** — `hooks/pre-commit.sh` runs `gate check --ci "$SUPERSKILL_GATE_TARGET"` only when `SUPERSKILL_GATE_TARGET` is set and both the CLI and `gate` command exist; without a target it exits 0 silently. `git commit --no-verify` bypasses it once, `SUPERSKILL_GATE=off` keeps it installed but skips the check, and `SUPERSKILL_CLI` overrides the CLI command.
- **CI** — `.github/workflows/ci.yml` runs a fast schema-only `validate --no-compile`, then a per-language toolchain matrix (`validate --lang <lang> --strict`) that compiles every Bad/Good snippet with the real compiler. `--strict` fails a job instead of silently skipping when a toolchain is missing.

Details and installation snippets: [harness integration](harness.md).

## Host execution boundary

For an enforced deployment with read-only data mounts, no network egress, least privilege and an external fsynced metadata audit, use the [restricted runtime](restricted-runtime.md). The policy below is the lower-level MCP control; it is not a substitute for that isolation boundary.

A restricted retrieval-only MCP dispatch profile can set `SUPERSKILL_MCP_ALLOWED_TOOLS` to `["read","project_context"]`. Tool enumeration is filtered and rejected calls fail before adaptation, workspace resolution or handler execution. Active-session resources separately require `session`; prompt task lookups separately require `task`. This is tool-name authorization, not per-action authorization: allowing a multi-action tool allows all its actions subject to its existing validation and project scope.

The allowlist restricts this MCP server's RPC dispatch, not its startup maintenance, standalone CLI commands, or other host tools. It is not an OS sandbox or network firewall. Run the process under a separate least-privilege identity/container with only the required mounts and writable metadata directories, enforce egress policy outside the process, and restrict the host's shell/file/network tools independently. Neither a repository file nor skill text can safely supply the policy that grants it more privileges.

Skill loading never authorizes running its support scripts. Inspection and activation return `execution: not-authorized`. Obtain an approved bundle digest through a separate review/release process, then configure pins in the trusted supervisor and enable pin-required mode; do not auto-approve a hash merely because inspection returned it. Pins detect changed bytes, not malicious intent, and cannot protect against an attacker who also controls the supervisor or process identity.

## Releases

npm publish is **manual** (`npm publish` on a maintainer machine). CI does not ship tokens.
