---
name: tdd
pack: pipeline
always: false
triggers: [tdd, test-driven, red-green, failing test]
---

# TDD (from Superpowers / Matt — our rules)

Learned: red-green-refactor, **vertical slice**, evidence the test failed for the right reason. Not a cargo-cult of their file layouts.

## When
New behavior or a bug with a repro. Skip for a comment-only change.

## Loop
1. Write **one** failing check. Run it. Confirm it fails **for this invariant**, not import noise.
2. Minimum code to pass. No extra branches.
3. Refactor only while green.
4. Next slice. Do not build the whole layer horizontally (Matt: no horizontal).

## Hard gates
- Do not write production code before a failing test exists for this slice.
- Do not claim green without the command output.
- Verify (`pipeline/verify`) before commit: evidence, not vibes.
