---
name: sre
pack: devops
always: false
triggers: [slo, sre, error budget, on-call, toil, golden signal, incident]
---

# SRE / platform (Google + Cloudflare, applied here)

Learned: SLOs and error budgets (Google); fail closed, blast radius, edge identity (Cloudflare). Not their internal runbooks.

## When
Incidents, on-call, deploy risk, “is this reliable?”. Skip for a rename.

## Steer
- **SLO** before new features: what user promise, what window, what burn.
- **Golden signals:** latency, traffic, errors, saturation — for the thing you just changed.
- **Fail closed** on authz. Timeouts on outbound calls. No retry storms.
- **Blast radius:** one tenant, one region, one flag. Roll forward or documented rollback.
- **Toil:** if humans must click it twice a week, automate or delete the step.
- **Blameless** notes in the vault (`learn`), not in git blame theater.

Cloud: the one this repo already uses. Least privilege, OIDC, no long-lived keys in the tree.
