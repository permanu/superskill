---
name: index
pack: security
always: true
triggers: [security, secret, auth, authz]
---

# Security index (always on during implement)

Apply these to **this** repo's vault facts, not in the abstract.

- No secrets in git, vault, logs, or skill content. Parameterized queries only.
- Every ID fetch is tenant-scoped. Authz on every mutating endpoint.
- Validate at trust boundaries. Default deny. No `exec` with a shell; use `execFile`.
- Full OWASP / pentest / SOC2 / ISO loads only on audit, review, ship, or an explicit compliance task — and then only after `project_context` + `resume`.
