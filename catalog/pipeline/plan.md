---
name: plan
pack: pipeline
always: false
triggers: [prd, spec, grill, brainstorm, write a plan, design doc]
---

# Plan / grill

Write a plan a builder can execute without the conversation. Transfer decisions they cannot safely reconstruct; leave routine implementation choices to the builder. Preserve the user's requested format and existing authorization.

## When
New product slice, unclear requirements, or the user asked for a spec. Skip for a known one-line fix.

## Loop
1. Resolve design branches from repository evidence first. Use `pipeline/analyze` when understanding a subsystem requires a component contract; do not demand an analysis report for every plan. Compare viable approaches, including reuse, on the actual constraints. If work moves onto a shared path, name its load and first failure mode.
2. State the goal, non-goals, authoritative spec/decisions, current behavior, and chosen approach. Separate new proposals from observed implementation. Copy binding values and compatibility constraints accurately. Grill only a named decision that changes acceptance or safety and that available evidence cannot settle. Do not reopen an answered decision or request permission already given.
3. Split into vertical slices with independently testable outcomes. Fold setup and documentation into the deliverable that needs them; split where one task could meaningfully fail while another passes. No task-duration quota or scaffolding-only task by default.
4. Check coverage and interface consistency before handoff. For each requirement, name the owning task and assertion. For each meaningful failure case, name its test or a specific verification gap. Check that later tasks consume exactly the interfaces earlier tasks produce. Flag consequential guesses; settle routine choices and state them.

## Task contract

Each task carries only the fields it needs, with none of its consequential decisions left implicit:

- Purpose and acceptance: observable behavior and what is out of scope.
- Files: exact paths marked Create, Modify, or Delete; respect forbidden paths.
- Consumes / produces: existing and new function signatures, data formats, or interfaces; dependencies on other tasks.
- Constraints: exact values, defaults, compatibility, failure ordering, and side effects that must be preserved.
- Verification: concrete test inputs and assertions, commands, and expected results. For behavior changes, plan a failing check for the intended invariant, then the minimum change to pass; distinguish planned checks from executed evidence.

Include code only when an algorithm, assertion, or exact value cannot be specified clearly otherwise. Do not transcribe implementation bodies that the interface and tests already determine.

## Handoff

Return the requested plan without implementing a planning-only request. Persist in this project's vault only when requested or required by project policy; use `brainstorm` for open options and `decide` for an authorized closed decision. A task brief carries its own constraints and needed interfaces, not the entire conversation.

Use the existing spec → approve → freeze → tickets → evidence workflow when applicable. Adding prose sections does not extend the spec parser or its hash. A plan, analysis, or model review is not passing gate evidence. On resume, reconcile the plan/spec version and recorded evidence with current source, including dirty changes, before skipping work as complete.

User instructions override the plan. SuperSkill does not own the host's process: no mandatory worktrees, delegated workers, review loops, or extra approval stages.
