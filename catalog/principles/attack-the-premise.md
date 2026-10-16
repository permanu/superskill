---
id: principle-attack-the-premise
title: Test the requirement before building it
apply_when: Apply when a task, bug report, or design rests on an assumption that has not been checked against evidence.
triggers:
  keywords: [premise, assumption, requirement, goal, scope]
enforce: review
related: [principle-exhaust-the-design-space, principle-never-block-on-the-human, principle-outcome-oriented-execution]
sources:
  - title: Google SRE Book — Effective Troubleshooting
    url: https://sre.google/sre-book/effective-troubleshooting/
status: verified
---
> Identify the load-bearing assumption and try to kill it with evidence before building on it.

## Patterns

- Separate the goal from the requested mechanism; "make checkout faster" and "add a cache" are different claims.
- Write the load-bearing premises down, each with the observation that would falsify it.
- Make the cheapest falsifying observation first — logs, a query, upstream docs, a two-line spike — before the full build.
- Distinguish constraints from habits: ask who pays if "must", "cannot", and "always" turn out false.
- Include the null option and its costs, including missed benefits and explicit commitments; do not cancel an agreed task unilaterally.
- On a false premise, report the finding with evidence and the alternative instead of building the wrong thing.
- Record a supported premise with its evidence and limits; revisit it when the conditions change.

## Tests

- What does this task assume, and which assumption would make the whole task pointless if false?
- What is the cheapest observation that could falsify the load-bearing premise, and has it been made?
- Is the requested mechanism necessary for the goal, or one option among several?
- What happens if we change nothing?

## See Also

- [principle-exhaust-the-design-space](exhaust-the-design-space.md) — falsified premises feed the option set.
- [principle-never-block-on-the-human](never-block-on-the-human.md) — premise checks replace questions that evidence can answer.
- [principle-outcome-oriented-execution](outcome-oriented-execution.md) — the goal survives even when the requested mechanism dies.
