---
id: principle-minimize-reader-load
title: Optimize code for the reader's working memory
apply_when: Apply when writing or reviewing code that another person will maintain — functions, names, control flow, comments.
triggers:
  keywords: [readability, naming, nesting, complexity, comments]
enforce: review
related: [principle-subtract-before-you-add, principle-model-the-domain, principle-explain-the-number]
status: verified
---
> Structure each unit so a reader needs the fewest facts held in mind at once.

## Patterns

- Keep the main path unindented: validate inputs and return early instead of nesting the happy path inside conditionals.
- One level of abstraction per function; move detail into named helpers rather than mixing policy and mechanics.
- Name by intent and role; name length grows with the size of the scope.
- Order code top-down: entry point first, then the steps it takes, helpers near first use.
- Delete comments that restate the code; keep only those that explain a non-obvious reason, constraint, or source.
- Remove surprises: no hidden global state, no side effects in lookups, no mutation of values the signature calls inputs.
- Run the repo's formatter; consistent layout lets readers spend attention on logic instead of decoding style.

## Tests

- How many facts must a reader hold to follow the main path of this unit?
- Can each function be understood from its name and body without opening its helpers?
- Which comment restates the code, and which explains a reason the code cannot show?
- Does any behavior contradict what the names and signatures promise?

## See Also

- [principle-subtract-before-you-add](subtract-before-you-add.md) — deleting code is the largest reduction in reader load.
- [principle-model-the-domain](model-the-domain.md) — domain names let readers import context they already have.
- [principle-explain-the-number](explain-the-number.md) — a justified constant spares the reader a mystery.
