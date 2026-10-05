# Author Batch - Prompt Template

Inputs: `lang`, `prefix`, `count`, plus `catalog/rules/<lang>/sources.md` and `categories.md` (create them if missing, per `docs/authoring/CONTRACT.md`).

## Steps

1. Read `docs/authoring/CONTRACT.md` fully and `docs/authoring/example-rule.md`.
2. Fetch the primary sources for this category. Record anything you use.
3. Draft each rule as its own file. One idea per file. Follow the exact frontmatter and body order from the contract.
4. Self-check every snippet with the language toolchain when available; note anything unchecked.
5. Update `INDEX.md` (partial indexes state their batch).
6. Report: files created, sources used, snippets checked, open questions.

## Quality bar

- The verifier's job must be easy, not hard: every claim traceable, every snippet complete.
- No hedging, no placeholders, no folklore.
- If a rule cannot be sourced, do not write it.
- If the contract is ambiguous, note the question in your report instead of improvising a format.
