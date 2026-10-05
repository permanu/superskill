---
id: principle-never-block-on-the-human
title: Never stall the whole task on one open question
apply_when: Apply when progress depends on a human answer — scope, preference, access, or approval — and other work can continue.
triggers:
  keywords: [question, blocked, assumption, options, handoff]
enforce: review
related: [principle-attack-the-premise, principle-laziness-protocol, principle-guard-the-context-window]
status: verified
---
> Ask at most once, with options and a recommendation, then proceed on everything unblocked.

## Patterns

- Check the repository, docs, and tests first; never ask what available evidence can settle.
- Batch open questions into one message, each with options, a recommendation, and the cost of being wrong.
- Decide reversible, cheap choices yourself and state the assumption; reserve questions for expensive or irreversible ones.
- Continue every unit the answer cannot affect; mark the blocked unit and its dependency instead of stopping the task.
- Leave blocked work resumable: the question, the options, and the state of the unblocked work in a durable artifact.
- Never invent an answer to avoid asking; label the assumption and its blast radius.
- On handoff, restate assumptions so the human reviews decisions, not history.

## Tests

- What exact decision is blocking, and which evidence in the repository could settle it?
- Is the choice reversible? If yes, why is it a question instead of a stated assumption?
- Which parts of the task can proceed regardless of the answer, and are they proceeding?
- If the session ended now, could a human answer the question from the artifacts left behind?

## See Also

- [principle-attack-the-premise](attack-the-premise.md) — check the premise before turning it into a question.
- [principle-laziness-protocol](laziness-protocol.md) — defer the blocked decision where possible and proceed elsewhere.
- [principle-guard-the-context-window](guard-the-context-window.md) — durable artifacts are what make waiting safe.
