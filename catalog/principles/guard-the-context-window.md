---
id: principle-guard-the-context-window
title: Keep working state outside the context window
apply_when: Apply when a task is long, output-heavy, or resumed after compaction, or when another agent will continue the work.
triggers:
  keywords: [context, compaction, resume, handoff, output]
enforce: review
related: [principle-never-block-on-the-human, principle-sequence-verifiable-units, principle-evidence-hierarchy]
sources:
  - title: Anthropic — Effective context engineering for AI agents
    url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
status: verified
---
> Persist essential working state, keep retrieved context relevant, and refresh stale inputs before editing.

## Patterns

- For long tasks, save the plan, decisions, current step, and open questions in task-authorized artifacts or the harness's durable handoff mechanism.
- Bound large outputs using tool previews, targeted queries, or saved artifacts; preserve necessary evidence without truncating a requested complete deliverable.
- Read the smallest region that answers the question: search first, then read around the hit.
- After compaction or resume, re-read the file and its conventions before editing; never trust a remembered version.
- Park unrelated threads with a pointer; retain cross-task context when dependencies require it.
- Summarize at unit boundaries — what changed, what passed, what is next — short enough to survive truncation.
- Reference artifacts by path plus the claim; a pointer beats a pasted blob.

## Tests

- If the context were lost now, could the next agent resume from artifacts alone?
- Are large outputs bounded, with necessary evidence retrievable?
- Was the current file state re-read after the last interruption before editing?
- What is carried in context that belongs in a file?

## See Also

- [principle-never-block-on-the-human](never-block-on-the-human.md) — durable state is what makes a blocked task resumable.
- [principle-sequence-verifiable-units](sequence-verifiable-units.md) — unit boundaries are the natural save points.
- [principle-evidence-hierarchy](evidence-hierarchy.md) — saved artifacts are how evidence survives compaction.
