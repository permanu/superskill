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
- UI/viz: `superskill-cli qa viz` — Chrome in **this** harness, not a plugin.
- Security fix: secret scan still clean; authz still on the ID path.

If verification is red, you are not done. Loop investigate — do not add a second patch on a guess.
