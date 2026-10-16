---
name: comment-discipline
pack: pipeline
always: false
triggers: [comments, nocomments, readability, tutorial, narration, TODO, FIXME, REFACTOR]
---

# Comment discipline

The compact baseline is delivered by activation's default policy in every phase, even at the minimum content budget. This pack expands it when comment work is requested. Guidance is not a compiler guarantee.

Write intent-revealing names, explicit types, small cohesive functions, early returns and clear ownership. Apply SOLID where it removes actual coupling; do not manufacture interfaces to avoid one useful explanation.

Before adding a comment, ask whether naming, a type, a test or simpler control flow can express it. Remove narration, numbered steps, decorative banners, commented-out code and stale descriptions. Keep the non-obvious reason, invariant, cross-module dependency, security constraint or external edge case close to the code it constrains. Link to a durable decision instead of copying a design document.

## Categories

- `TODO`: bounded deferred work, with tracking reference and completion condition.
- `FIXME`: known incorrect behavior, with impact and tracking reference.
- `BUG`: a tracked defect or upstream defect; state the affected condition.
- `HACK`: temporary workaround; state the external constraint and removal condition.
- `REFACTOR`: specific structural debt with tracking reference; not speculative cleanup.
- `INFO`: rare rationale or invariant that the code cannot express clearly.
- `ERROR`: rare explanation of a non-obvious failure contract; not a substitute for validation, error handling or logging.

Use `REFACTOR`, not `REFEACTOR`. Do not relabel narration as INFO. Track debt in the issue system; a marker does not authorize shipping known security, privacy or money-correctness defects. Release gates still apply.

Preserve license/SPDX notices, generated-file markers, tooling directives (with required syntax and justification), and public API documentation that adds a real contract. Do not prefix these with a category if that breaks tooling. Keep required Rust safety explanations and legal notices. Do not delete rationale merely because an AI is reading the file.

## Review evidence

Review changed code and its callers. Verify that removed comments did not carry an invariant or external dependency. Check retained prose against current behavior and tests. Use language-aware checks for mechanical violations; human/agent review decides semantic usefulness. No comment-count quota and no regex mass deletion.

Examples: omit `Increment retry count` above an increment. Retain `INFO: Keep this check inside the lock; the owner may change while waiting.` only when the lock invariant is not otherwise explicit.
