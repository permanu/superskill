---
id: principle-evidence-hierarchy
title: Rank evidence by proximity to the claim
apply_when: Apply when reporting status — done, fixed, passing, safe — or when choosing what to run to support a claim.
triggers:
  keywords: [evidence, proof, test, verification, claim, status]
enforce: both
related: [principle-test-behavior-not-implementation, principle-fix-root-causes, principle-explain-the-number]
sources:
  - title: Google SRE Book — Effective Troubleshooting
    url: https://sre.google/sre-book/effective-troubleshooting/
  - title: Google Engineering Practices — What to look for in a code review
    url: https://google.github.io/eng-practices/review/reviewer/looking-for.html
status: verified
---
> Match every claim to the strongest evidence available and report it with its source.

## Patterns

- State the claim, then its evidence; a passing command supports only the behavior or property it checks.
- Match the method to the claim: runtime tests for exercised behavior, type checks for encoded constraints, and inspection for design reasoning. No fixed ranking makes an unrelated end-to-end run stronger than a targeted check.
- Quote the command, the revision, and the observed line — the first failure or the pass summary.
- Take evidence from this revision and this environment; a result from another branch proves another branch.
- Use the pipeline's own command when claiming CI parity; label focused checks with their narrower scope.
- State evidence limits; inspection never masquerades as a run, and one successful run does not prove absence of races.
- For search-based negative claims, show the pattern and scope; no matches do not rule out dynamic or external callers.
- Keep the raw artifact addressable so a reviewer can check the claim without re-running it.

## Tests

- What exactly is the claim, and which command or artifact supports it?
- Was the evidence produced from the current revision and environment?
- Does the evidence exercise the claim directly, or something adjacent to it?
- If the strongest check could not run, is that gap stated instead of hidden?

## See Also

- [principle-test-behavior-not-implementation](test-behavior-not-implementation.md) — a test is only evidence when it exercises behavior.
- [principle-fix-root-causes](fix-root-causes.md) — the reproduction doubles as the fix's evidence.
- [principle-explain-the-number](explain-the-number.md) — a constant needs a derivation the way a claim needs evidence.
