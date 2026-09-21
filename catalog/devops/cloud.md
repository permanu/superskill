---
name: cloud
pack: devops
always: false
triggers: [deploy, aws, gcp, azure, vps, terraform, kubernetes, ci, cd, docker, rollback, slo, platform]
---

# Platform engineering (lazy)

Load when the job is **ship, deploy, incident, or infra** — not on a function rename. One cloud: the one this repo already uses.

Think like the person who gets paged: identity, blast radius, rollback, signals.

## Diagnose the slice
- **Build/CI:** pin actions/images; `npm ci` / `cargo test` on this OS; no secrets in logs.
- **Release:** artifact in, same artifact out. Migrations expand then contract. Rollback is a documented command, not a hope.
- **Runtime:** health that means "serving correctly", not "process up". Golden signals (latency, traffic, errors, saturation) for the thing you just shipped.
- **Identity:** least privilege. OIDC from CI. No long-lived keys in the tree.
- **Data:** backups you have restored once. Encryption at rest for stores that hold user data.
- **VPS:** unattended upgrades, SSH keys, TLS at the proxy.

AWS / GCP / Azure: private data stores, no `0.0.0.0/0` on them. Do not add a second cloud "for flexibility".

## Loop
If deploy failed: investigate (pipeline) → fix → review the rollback path → deploy again. Do not "retry the pipeline" as the fix.
