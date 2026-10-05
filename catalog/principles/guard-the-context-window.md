---
id: principle-guard-the-context-window
title: Keep working state outside the context window
apply_when: Apply when a task is long, output-heavy, or resumed after compaction, or when another agent will continue the work.
triggers:
  keywords: [context, compaction, resume, handoff, output]
enforce: review
related: [principle-never-block-on-the-human, principle-sequence-verifiable-units, principle-evidence-hierarchy]
status: verified
---
> Persist state in artifacts, bound every output, and re-read before editing after any interruption.

## Patterns

- Write the plan, decisions, current step, and open questions to files as the task progresses.
- Bound every command's output: filter to relevant lines or redirect the full result to a file and read the part needed.
- Read the smallest region that answers the question: search first, then read around the hit.
- After compaction or resume, re-read the file and its conventions before editing; never trust a remembered version.
- Finish or park unrelated threads with a written pointer; one task per context.
- Summarize at unit boundaries — what changed, what passed, what is next — short enough to survive truncation.
- Reference artifacts by path plus the claim; a pointer beats a pasted blob.

## Tests

- If the context were lost now, could the next agent resume from artifacts alone?
- Is every command's output bounded, and is the full result saved somewhere addressable?
- Was the current file state re-read after the last interruption before editing?
- What is carried in context that belongs in a file?

## See Also

- [principle-never-block-on-the-human](never-block-on-the-human.md) — durable state is what makes a blocked task resumable.
- [principle-sequence-verifiable-units](sequence-verifiable-units.md) — unit boundaries are the natural save points.
- [principle-evidence-hierarchy](evidence-hierarchy.md) — saved artifacts are how evidence survives compaction.
