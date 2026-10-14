---
name: verify
pack: pipeline
always: false
triggers: [verify, evidence, claim done, before commit, before merge]
---

# Verify before done (Superpowers — evidence, not vibes)

Do not say fixed/passing/complete without a command or harness result from **this OS**.

## When
About to commit, merge, or tell the user it works. Always for security fixes.

## Checks (pick what applies)
- Tests you touched: paste the first failing line or the pass line.
- Types/lint if the repo has them.
- Browser/UI: use the existing application harness and report the exact result or state that it is unavailable. Run `superskill graph viz` only when generated-note output changed or the user explicitly requested it; inspect actual outputs rather than assuming fixed counts.
- Security fix: secret scan still clean; authz still on the ID path.

If verification is red, you are not done. Loop investigate — do not add a second patch on a guess.
