# Security

- **Vault jail** — paths are rewritten under `projects/<slug>/`; traversal and symlink escapes are rejected; sibling projects are denied. `VAULT_PATH` is bounded to the home directory.
- **Data-only metadata** — Markdown frontmatter accepts YAML and JSON objects, never executable engines. Metadata parsing has a byte budget, and production loaders share the same parser boundary.
- **Secret scanner** — `write` blocks secret-like content with `SECRET_REJECTED` before anything is stored, covering common provider keys (OpenAI, Anthropic, Google, AWS secret access keys), webhooks, and generic tokens. Vault mutations are recorded in a local audit trail (`~/.superskill/audit/vault-writes.jsonl`, path/op/bytes only — never content).
- **Audit gate** — explicit audit failures always block installation, including with `--allow-unaudited`. Unknown and warn-only audits require that flag; non-all-pass installs are marked `.unaudited-superskill`. Installs preserve the selected bundle from one resolved Git commit and record file hashes separately in `.superskill-provenance.json`. skills.sh audits are not commit-bound, so even all-pass results are recorded as unversioned repository audits, not attestations of the installed revision. At activation, explicit failures block loading; unknown/warn audits remain visible without blocking local/native skills.
- **Prompt-injection scan** — skill content is scanned before injection for override, exfiltration, secrecy, and destructive-command patterns; hard blocks are dropped with a warning. Installs scan bounded UTF-8 support files, including scripts, without executing them. Bounded non-executable PNG, JPEG, GIF, WebP, and PDF assets require matching signatures and extensions; their hashes are recorded, but they are not prompt-scanned or certified malware-free. Unsupported binaries, native executables, archives, unsafe links, and malformed assets are refused rather than silently omitted.
- **MCP rate limit** — write tools are limited to 30 operations per minute per server.

## Trust boundaries

The project jail applies to the connected agent, not just to filenames supplied to `read`. Search, graph traversal, resources, and generated notes must keep the selected project scope. Register an unmapped workspace before accessing implicit project memory. Supported explicit-project reads select their own jail; workspace-derived tools must not mix one checkout's code into another project's memory.

The vault and local state contain private information. Keep them outside repositories and review any Obsidian sync, backup, or sharing configuration separately. A local-only feature can still disclose content when its result is returned through MCP to the connected model. Watchdog transcript excerpts require explicit opt-in; see [Watchdog](watchdog.md).

SuperSkill does not upload telemetry. Explicit skill installation contacts skills.sh and GitHub; Java snippet compilation can download pinned Maven artifacts; package installation and latest-version launchers use their package registries. Native diagnostics can contact user-configured services, such as a remote Docker daemon. These operations are separate from local knowledge search. The connected host's model and data-retention policy are outside SuperSkill's control.

Secret detection and prompt-injection scanning are defense-in-depth heuristics, not proofs that content is safe. They cannot recognize every credential, personal detail, or instruction attack. Review the source and permissions of installed skills, including support scripts, before allowing an agent to execute them. A passing third-party audit is not execution authorization.

Native skill-profile validation checks metadata and bundle constraints, not whether a model follows the skill effectively. Anthropic recommends evaluating with the exact models and workflows intended for use; do not treat green unit/fixture checks as model-quality evidence. A `portable` profile does not guarantee offline operation or compatibility with every host: skills that require Node, MCP tools, packages, or network services depend on those capabilities. Anthropic documents that Claude API code execution has no network access or runtime package installation; see its [skill-authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Filesystem and recovery limits

New private state uses restrictive file permissions; note updates preserve existing file permissions. Writes use ownership-checked locks and atomic replacement. Recovery must distinguish corrupt data from an I/O failure: a permission or disk error is not permission to replace existing state with an empty file. Generated content must not overwrite hand edits or remove a file solely because its name resembles a legacy artifact.

Symlink checks reduce accidental and repository-controlled path escapes. Portable Node filesystem APIs do not provide a complete sandbox against a hostile local process racing to replace parent directories. Do not share a writable vault or checkout with untrusted local users. File locks coordinate processes on a filesystem with atomic exclusive creation; file-sync services do not provide a distributed lock service.

Cleanup reports and dry runs are not authorization to delete files. Use explicit apply/confirmation controls, preserve recovery manifests, and keep uncertain worktrees or caches. No cleanup should rely solely on a live-looking PID from another machine, a reusable path, or a cache-name prefix.

## Verification

`npm run build` followed by `npm test` exercises the built MCP boundary as well as library tests. `npm audit`, `npm run check:versions`, and `npm run verify:grammars` check dependencies, release metadata, and vendored parser integrity. The package-boundary regression test checks that local memory, traces, tests, and source maps do not enter the npm artifact. These checks cover known cases; a passing suite is not a guarantee of zero vulnerabilities.

## Remaining upstream advisory

As of 2026-10-14, the updated lockfile has no high or critical audit findings. [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) remains as four moderate dependency entries along `gray-matter → js-yaml → argparse → sprintf-js`; no patched sprintf release is available. YAML parsing and serialization do not import argparse or sprintf, the application does not invoke the YAML CLI, and executable frontmatter is blocked at the shared parser boundary. The advisory remains visible rather than suppressed or hidden by an incompatible downgrade. CI and release verification reject high/critical advisories with `npm audit --audit-level=high`.
