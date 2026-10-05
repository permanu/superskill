---
id: principle-encode-lessons-in-structure
title: Turn each lesson into a mechanism, not a memory
apply_when: Apply when an incident, escaped bug, or repeated review comment leaves a lesson that risks being forgotten.
triggers:
  keywords: [lesson, regression, lint, incident, guardrail]
enforce: both
related: [principle-fix-root-causes, principle-test-behavior-not-implementation, principle-type-system-discipline]
status: verified
---
> Convert each escaped failure into a machine-enforced artifact that prevents the whole class.

## Patterns

- Require at least one structural artifact per incident: a regression test, a type, an assertion, a lint rule, or a schema constraint.
- Prefer machine enforcement over prose; a check that fails CI beats a note that nobody reads.
- Place the guard at the lowest layer that detects the mistake, so it fires for every instance, not one call site.
- Fix the class, not the instance: when one call site missed a check, make the check mandatory rather than patching that site.
- Link the artifact to the incident in the commit or a comment so its reason survives its author.
- Delete guards whose failure mode became unrepresentable; stale checks cost attention on every run.
- Write the lesson down only after the guard exists; prose is the fallback, not the deliverable.

## Tests

- Which artifact now fails if this mistake happens again?
- Is the guard machine-enforced at every applicable site, or dependent on a human remembering?
- What class does the guard cover beyond this instance?
- Which older guard is now redundant and should be removed?

## See Also

- [principle-fix-root-causes](fix-root-causes.md) — the fix precedes the guard.
- [principle-test-behavior-not-implementation](test-behavior-not-implementation.md) — the default structural guard is a behavior test.
- [principle-type-system-discipline](type-system-discipline.md) — the strongest guards are types.
