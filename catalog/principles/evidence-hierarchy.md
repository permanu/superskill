---
id: principle-evidence-hierarchy
title: Rank evidence by proximity to the claim
apply_when: Apply when reporting status — done, fixed, passing, safe — or when choosing what to run to support a claim.
triggers:
  keywords: [evidence, proof, test, verification, claim, status]
enforce: both
related: [principle-test-behavior-not-implementation, principle-fix-root-causes, principle-explain-the-number]
status: verified
---
> Match every claim to the strongest evidence available and report it with its source.

## Patterns

- State the claim, then the evidence: "fixed" is a command output, not a reading of the diff.
- Prefer evidence that exercises the claim end to end: a run beats a test, a test beats a type check, a type check beats a lint pass, and all of them beat inspection.
- Quote the command, the revision, and the observed line — the first failure or the pass summary.
- Take evidence from this revision and this environment; a result from another branch proves another branch.
- Use the pipeline's own command; a custom invocation proves less about what CI will see.
- Label weak evidence as weak; inspection never masquerades as a run.
- For negative claims, show the search: the pattern and scope that found no other callers.
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
