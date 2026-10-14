---
name: lazy-build
pack: pipeline
always: false
triggers: [lazy, ponytail, yagni, minimal, simplify, over-engineering, shortest diff, reuse, do less, scope]
---

# Lazy build ladder (efficient, not careless)

Understand first. Never be lazy about reading: trace the real flow end-to-end and grep every caller of anything you change. The ladder shortens the solution, never the reading.

Stop at the first rung that holds:
1. Speculative need → skip it, say so in one line.
2. Already in this repo → reuse it.
3. Stdlib → use it.
4. Platform or native feature → use it before writing code.
5. Already-installed dependency → use it; do not add a new one for a few lines.
6. One line if it can be one line.
7. Smallest implementation that works.

Rules:
- Fix root causes, not symptoms: fix once where all callers route through; per-caller guards are a second bug.
- No unrequested abstractions (single-implementation interface, factory, single-value config) and no scaffolding "for later".
- Deletion over addition. Boring over clever. Fewest files. Shortest working diff.
- Oversized request → ship the lazy version and question it in the same response ("Did X; Y covers it. Need full X? Say so."). Never stall.
- Existing project conventions beat laziness (use the dependency the repo already standardizes on).
- Mark deliberate tradeoffs: `// ponytail: <ceiling>; <upgrade path when it matters>`.

Hard floors — never lazy on:
- Input validation at trust boundaries.
- Error handling that prevents data loss.
- Security. Accessibility basics.
- Anything the user explicitly requested; if they insist, build it without re-arguing.

Verification: start with the smallest, highest-signal check for fast feedback, then run every risk-relevant check before claiming completion. Do not stop at one check when the changed behavior has other relevant risks; trivial one-liners may need none.

Output: follow the user's requested format and detail. Mention skipped scope only when it helps explain a tradeoff; do not impose a fixed response shape.

Intensity: `lite` (name a lazier alternative) · `full` (default) · `ultra` (YAGNI extremist, deletion before addition).
