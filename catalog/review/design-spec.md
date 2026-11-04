---
name: design-spec
pack: review
always: false
triggers: [design-spec, independent design review, specification, implementation readiness]
---

# Independent design review

Use only for requested design/spec review. A code diff uses the existing code review; simple tasks need no extra pass. Loading this pack launches nothing and authorizes no delegation. The host owns execution and permissions.

Choose only the needed lens:
- Comprehension: specification alone. Paraphrase the proposal, then identify ambiguity or consequential missing decisions.
- Readiness/reuse: specification, plan if needed, and an explicit bounded source/interface list. Check compatibility, failure behavior, reuse, and testable acceptance. Proposed Create files are not missing implementations.

The author may use project memory; a blind reviewer must receive only this brief and its allowed inputs, without author conversation, rationale, vault bootstrap, unrelated skills, or other reviewer answers. Do not call normal skill activation inside the blind reviewer: it loads author-side context. A fresh chat alone does not prove isolation.

Before dispatch, verify the host can observe fresh context, enforce instruction/memory/tool boundaries, and capture all inputs/actions. Fingerprint full supplied bytes, including dirty source; HEAD or the parsed spec hash is insufficient. Set finite input, output, time and pass budgets. If the host cannot establish these boundaries, report `isolation unverified`; do not advertise an independent review. Do not weaken host instructions or permissions to manufacture isolation.

Wait for actual reviewer completion. A launch, saved report, timeout, or reviewer saying "done" is not host completion evidence. Incomplete reads/traces or changed inputs leave the review unverified. Use the offline host checks in `docs/authoring/design-review.md` only when qualifying a host; do not load them for ordinary tasks.

Return findings with input location, consequence, evidence, and a concrete fix or question. Preserve unknowns. Resolve each as fixed, contested with inspectable evidence, deferred, or unresolved; prior private discussion is not a rebuttal. One pass per needed lens, at most one targeted re-review. Exhausting the budget never clears blockers.

Persist only when requested through project-scoped vault operations. No automatic edits or approvals. Reviews are advisory: they neither satisfy ticket evidence nor approve/freeze a spec. A no-findings result covers only inspected inputs, never general correctness.
