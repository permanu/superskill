---
id: principle-encode-lessons-in-structure
title: Turn recurring lessons into preventive mechanisms
apply_when: Apply when an incident, escaped bug, or repeated review comment leaves a lesson that risks being forgotten.
triggers:
  keywords: [lesson, regression, lint, incident, guardrail]
enforce: both
related: [principle-fix-root-causes, principle-test-behavior-not-implementation, principle-type-system-discipline]
sources:
  - title: Google SRE Book — Postmortem Culture
    url: https://sre.google/sre-book/postmortem-culture/
status: verified
---
> Prefer durable preventive mechanisms over relying on memory; document what they cover and what they cannot prevent.

## Patterns

- Choose preventive actions proportionate to the incident: a regression test, type, assertion, lint rule, schema constraint, or process improvement.
- Prefer machine enforcement over prose; a check that fails CI beats a note that nobody reads.
- Place the guard at the layer that owns the invariant and has enough context to detect the mistake.
- Fix the class, not the instance: when one call site missed a check, make the check mandatory rather than patching that site.
- Link the artifact to the incident in the commit or a comment so its reason survives its author.
- Delete guards whose failure mode became unrepresentable; stale checks cost attention on every run.
- Record the lesson promptly, including an owner and follow-up for unfinished prevention; documentation need not wait for automation.

## Tests

- Which artifact now fails if this mistake happens again?
- Is the guard machine-enforced at every applicable site, or dependent on a human remembering?
- What class does the guard cover beyond this instance?
- Which older guard is now redundant and should be removed?

## See Also

- [principle-fix-root-causes](fix-root-causes.md) — the fix precedes the guard.
- [principle-test-behavior-not-implementation](test-behavior-not-implementation.md) — the default structural guard is a behavior test.
- [principle-type-system-discipline](type-system-discipline.md) — types enforce the distinctions a checker can express.
