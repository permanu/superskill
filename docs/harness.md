# Harness Integration

How SuperSkill supplies optional lifecycle guidance to supported coding harnesses, and
how the enforcement surfaces are wired. Integration is optional and non-blocking: a
missing hook, CLI, or gate command never blocks a session or a commit.

## Support and verification

Setup writes client configuration; it does not prove that a running host has loaded
the server or that its model will select the tools. The registry labels documented
configuration contracts separately from unsupported native integration. Filesystem
contract tests exercise setup, repeated setup, unrelated-setting preservation and
teardown for every supported adapter. A host handshake and an actual tool call are
separate release evidence. No adapter carries a blanket `verified: true` flag.

| Client | Setup target | Scope |
| --- | --- | --- |
| Claude Code | `~/.claude.json`, `mcpServers` | User MCP configuration |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS | Desktop MCP configuration |
| Cursor | `~/.cursor/mcp.json`, `mcpServers` | User MCP; local user rules in `~/.cursor/rules` |
| OpenCode | `~/.config/opencode/opencode.json`, `mcp` | `type: local`, command array, `environment` |
| Crush | `~/.config/crush/crush.json`, `mcp` | `type: stdio`, command and args |
| Codex CLI | `~/.codex/config.toml`, `mcp_servers.superskill` | User MCP configuration |
| Gemini CLI | `~/.gemini/settings.json`, `mcpServers` | User MCP configuration |
| Droid | `~/.factory/mcp.json`, `mcpServers` | Personal instructions in `~/.factory/AGENTS.md` |
| Windsurf (legacy editor) | `~/.codeium/windsurf/mcp_config.json`, `mcpServers` | Global instructions in `memories/global_rules.md` |
| Continue IDE | `~/.continue/mcpServers/superskill.json`, `mcpServers` | IDE extension; not Continue CLI (`cn`) |
| Aider | No native MCP setup | CLI output supplied as context |

The corrected contracts follow the official [Crush MCP configuration](https://github.com/charmbracelet/crush#mcps),
[Droid MCP schema](https://docs.factory.com/harness/mcp),
[Droid instruction discovery](https://docs.factory.com/harness/agents-md),
[Cursor user-rule locations](https://prod.cursor.com/help/customization/rules), and
[Continue JSON MCP support](https://docs.continue.dev/customize/deep-dives/mcp) with
[global configuration blocks](https://docs.continue.dev/guides/configuring-models-rules-tools).
Continue CLI has a [separate configuration contract](https://github.com/continuedev/continue/blob/main/extensions/cli/spec/mcp.md);
its IDE directory discovery must not be assumed to work in the CLI.

Windsurf documentation now redirects to Devin Desktop. The `windsurf` adapter
retains the legacy editor location; it does not configure Devin Desktop, whose
[Cascade MCP documentation](https://docs.devin.ai/desktop/cascade/mcp) specifies
`~/.config/devin/mcp_config.json` (or its XDG equivalent). The documented
[global Cascade rules file](https://docs.devin.ai/desktop/cascade/memories) remains
`~/.codeium/windsurf/memories/global_rules.md`. Open the host's MCP configuration
screen to confirm the location for the installed product/version.

Aider's [native MCP request](https://github.com/Aider-AI/aider/issues/4506) remains
open. `setup --clients aider` rejects the unsupported integration without writing
a pretend MCP configuration; `setup --all` excludes it. Use the installed CLI to
retrieve only the context needed, then supply that output to Aider:

```bash
superskill-cli graph resolve "task description" --project your-project
superskill-cli graph open "selected-node-id" --project your-project
```

Unknown client slugs are errors. Setup failures return a nonzero exit status.
Restart or reload your host after upgrading and confirm that `superskill` tools
appear before relying on the integration. Provider credentials, host policies,
model tool support and tool limits remain host requirements.

When rerunning setup, generated SuperSkill entries in the old Windsurf `mcp.json`
and Continue `config.json` are removed only after the new setup succeeds. Custom
wrappers and unrelated entries are preserved. Droid and Windsurf instruction
migration removes only SuperSkill's marked block from the old file. Backups of
modified JSON configurations use the `.bak.superskill` suffix.

## Automatic server updates

Managed setup launches `npx -y --prefer-online superskill@latest`, using string
command plus args or the equivalent OpenCode command array. Codex receives the
same args in TOML. On each new MCP process, npm checks fresh registry metadata and
resolves the stable `latest` tag. See the [npm exec reference](https://docs.npmjs.com/cli/v11/commands/npm-exec/#prefer-online).
Publishing under another tag does not change `latest`. A running MCP process is
not replaced, and there is no instant push into an active host session. Offline
npm/cache behavior may use an already cached version or fail; latest-version
uptake requires registry access.

Rerunning setup upgrades only recognized generated launchers and preserves the
existing vault path, extra environment keys and unrelated client settings. Explicit
version pins, custom binaries, custom launchers and extra command arguments remain
unchanged unless the user explicitly requests replacement. Recognized marked Codex
blocks are updated in place; unmarked existing tables are preserved.

Run setup once for initial installation or migration. Each later MCP startup uses
the same managed-state reconciliation path: it refreshes an existing marked shared
skill and safely owned instruction blocks, then reconciles recognized managed
launchers and known legacy aliases for detected clients. It does not create missing
integrations or overwrite custom/pinned launchers, ambiguous blocks, or unrelated
settings. Cursor MDC and OpenCode instruction files are refreshed only when the
existing integration is recognized and the SuperSkill-owned content can be updated
safely. Start a new host session to load refreshed instructions; an existing session
keeps its already-loaded context.

## Constitution

`catalog/constitution.md` holds optional T0 guidance. Its contents are not
universally or continuously injected. The optional session-start hook reads and emits
the file only when a host is configured to run that hook; a host may also explicitly
open the `constitution` graph node. Guidance applies when it is actually included in
the host's context, not through automatic background loading.
Each item names the mechanism that enforces it (gate check, rules validator, security
scanner, router, loader, review).

The rules validator rejects rules that contradict the constitution's non-negotiables
(placeholder tokens, missing sources, unverified status). The gate commands consume
`gate check` evidence; the constitution only states the rule. The token budget and
stable IDs are enforced by `tests/constitution.test.ts`.

## Bootstrap blurb

`superskill setup` writes a short instruction block for clients with a configured
instruction file (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, Cursor `.mdc`, OpenCode
instructions file). The block is delimited by `<!-- superskill:begin -->` /
`<!-- superskill:end -->` markers and is idempotent; only the marked block is
rewritten, so user content around it is preserved. Blocks written by older
releases under the `<!-- superskill:start -->` marker are recognized and upgraded
in place.

`superskill skill init` appends the same minimal rules to an existing
`AGENTS.md` / `CLAUDE.md` under the `## SuperSkill` heading, and skips files that
already contain that heading.

At every session start, the injected text asks the host to resolve the actual
checkout. If it is unmapped, call the `register` tool with that checkout's absolute
`path` and use the returned slug instead of guessing a project. Then load context
and search, register its own session
with the absolute workspace path, and call `superskill` with the task, affected
files, session ID and explicit phase (`explore|implement|review|ship`) immediately
in the first phase. This activation initializes a missing graph from the local
catalog for the mapped workspace. Reroute on
meaningful task/file/phase changes and before verification or completion; reuse a
result within the same phase instead of calling the router on every tool action.

Consume the returned `worktree` assessment before installs/builds and at completion.
Run follow-up inspection in the exact returned workspace, using the CLI with that
working directory when a tool cannot accept a path. Inspection is the default. The
built-in completed-session cleanup is limited to clean, idle, session-owned worktrees
proven integrated into the repository's configured default branch and eligible under
the lifecycle checks. Eligible checkouts move to locked recovery archives; cleanup
never automatically deletes them. Active, uncertain or ineligible worktrees remain
in place with reasons reported. Do not force removal or substitute a shell cleanup.
Other policy activation, cache apply/GC and manual removals still require authorization.
Complete the same session with evidence and report pending actions.

For delegated delivery, the coordinator integrates related dependent worker changes
into an ordered local branch/PR stack. Validate each layer and the combined top
before a batch push; workers do not independently push or create PRs by default.
Keep unrelated parallel work separate. Publishing and remote merging still require
authorization and applicable review/CI. After merging into the repository's default
branch, complete owning sessions and check lifecycle cleanup so eligible completed
worktrees do not linger.

These instructions guide agents; an MCP server cannot force a host to invoke a
tool or observe a task/phase change the host never reports. The optional session-start
hook only supplies its configured context; it is not a cross-harness maintenance
scheduler. Verification evidence still has to be produced by the relevant checks.

## Hooks

### Session start

`hooks/session-start.sh` reads `catalog/constitution.md` and emits it as session
context when explicitly configured. It exits 0 with no output when the file is
missing. The hook does not configure itself or force a host to retain or act on the
emitted text.

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

`hooks/pre-commit.sh` runs `superskill gate check --ci "$SUPERSKILL_GATE_TARGET"`
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
- `SUPERSKILL_CLI=/path/to/superskill` overrides the CLI command.

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
