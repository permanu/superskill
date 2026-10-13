# Workflows

## Gates walkthrough

```bash
# 1. Draft a spec. Gaps are reported back; nothing is enforced yet.
superskill spec create -t "Add OAuth login" \
  --goal "Users sign in through the company IdP" \
  --non-goals "No SAML, no SCIM" \
  --constraints "No new runtime dependencies" \
  --context "Auth is currently password-only" \
  --allowed-files "src/auth/**" "src/routes/login.ts" \
  --forbidden-files "src/db/**" \
  --acceptance "Login redirects to the IdP | run: npm test -- auth" \
  --acceptance "Error copy matches the design | manual: design review" \
  --risks "IdP outage blocks all logins" \
  --rollback "Revert the merge commit"

# 2. Fill every gap, approve, then freeze (freeze pins the content hash).
superskill spec status 001
superskill spec approve 001
superskill spec freeze 001

# 3. Derive tickets from the frozen spec.
superskill tickets create --spec 001 --tickets '[
  { "title": "Add IdP redirect",
    "acceptance": [{ "text": "Redirect works", "command": "npm test -- auth" }] },
  { "title": "Handle callback errors",
    "acceptance": [{ "text": "Copy reviewed", "manual": "design review" }],
    "requires_review": true }
]'
superskill tickets ready

# 4. Record evidence at HEAD, then gate.
superskill evidence add ticket-001 -c "npm test -- auth" --output "42 passed"
superskill gate check ticket-001     # exit 0 only when the gate passes
superskill gate check --ci 001       # JSON output for CI
```

What the gate enforces:

- **Spec** — every skeleton field filled, acceptance items valid, status `frozen`, stored hash matches content.
- **Ticket** — acceptance present and valid; spec frozen and unchanged since ticket creation (`spec_hash`); latest evidence recorded at the current git HEAD with exit 0; a passing review record (`review` / `review:<verdict>`) when `requires_review` is set.

`evidence add` defaults `--commit` to git HEAD and truncates stored output. Use `--head` to override the HEAD used by a gate check.

## Rule planning

Rule selection is deterministic and explainable. Pass `files` (repo-relative) so file-triggered rules are selected without guessing:

```jsonc
// MCP tool call
{ "task": "harden the upload retry path", "files": ["src/upload/s3.ts"] }
```

The response includes `rules_plan`:

- `selected[]` — `{ id, title, reason }`; `reason` lists matched keys: `file <glob> (Nx)`, `keyword '<term>' (Nx)`, `symbol '<Name>' (Nx)`.
- `explain[]` — one derivation line per rule: `rule <id> selected: <matches>, severity <must|should|prefer>`.
- `dropped[]` — `{ id, reason: "oversized" | "budget", tokens }`.
- `budget` — `{ allocated, used }`.

Only `status: verified` rules are eligible by default, so a catalog with no verified rules returns an empty `selected` list — the plan is honest about it rather than injecting drafts. Authoring and verification rules live in [`docs/authoring/CONTRACT.md`](authoring/CONTRACT.md); validate the catalog with `npm run validate:rules`.
