# Security

- **Vault jail** — paths are rewritten under `projects/<slug>/`; traversal and symlink escapes are rejected; sibling projects are denied. `VAULT_PATH` is bounded to the home directory.
- **Secret scanner** — `write` blocks secret-like content with `SECRET_REJECTED` before anything is stored, covering common provider keys (OpenAI, Anthropic, Google, AWS secret access keys), webhooks, and generic tokens. Vault mutations are recorded in a local audit trail (`~/.superskill/audit/vault-writes.jsonl`, path/op/bytes only — never content).
- **Audit gate** — skill installs are fail-closed: `fail`, `unknown`, and warn-only audits are refused unless you pass `--allow-unaudited`, and non-all-pass installs are marked `.unaudited-superskill` with provenance visible in `skill list`/`skill status`. At activation, explicit failures block loading; unknown/warn audits warn without blocking, so local/native skills remain usable.
- **Prompt-injection scan** — skill content is scanned before injection for override, exfiltration, secrecy, and destructive-command patterns; hard blocks are dropped with a warning. Installs scan every Markdown file in the skill directory before copying.
- **MCP rate limit** — write tools are limited to 30 operations per minute per server.
