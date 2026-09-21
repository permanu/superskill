---
name: compliance
pack: security
always: false
triggers: [audit, owasp, pentest, soc2, iso, compliance, cwe, secrets, threat, asvs]
---

# Compliance (lazy)

Load when the change is audit, review, ship, pentest, SOC2, ISO — or when implement touched auth, money, or tenancy. Skip for a CSS typo.

Control checklist **on this diff**, not a legal opinion. Vault/graph first: `project_context`, `resume`, `search` (auth, tenancy, cred_refs). If an ADR contradicts the diff, the diff is wrong.

## Secrets and data
- Fail the change if a key, token, private key, or connection string is introduced.
- Vault writes that look like secrets must be rejected. Prefer references.

## OWASP (app)
1. Broken access control — IDOR, missing authz on write, cross-tenant read.
2. Cryptographic failures — secrets at rest, TLS, no home-rolled crypto.
3. Injection — SQL/command/template. Parameterize. `execFile` only.
4. Insecure design — threat model for new auth, money, or multi-tenant paths.
5. Security misconfiguration — debug left on, open CORS, default creds.
6. Vulnerable components — pin and scan; block `fail` audits.
7. Auth failures — session fixation, weak reset, missing MFA on admin.
8. Integrity — unsigned deploys, unpinned actions.
9. Logging — no secrets in logs; enough to reconstruct authz failures.
10. SSRF — do not fetch attacker-controlled URLs from the server.

## Pentest (narrow)
Recon only in scope. Prove one exploitable path: unauth → data or RCE. No payload dumps in the vault. Report: asset, step, impact, fix.

## SOC2 / ISO (engineering controls)
Access control, change management, encryption, logging, vendor risk, backup/restore tested. Map each new feature to: who can call it, what is logged, how it is reverted.
