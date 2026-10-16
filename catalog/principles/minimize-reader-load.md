---
id: principle-minimize-reader-load
title: Optimize code for the reader's working memory
apply_when: Apply when writing or reviewing code that another person will maintain — functions, names, control flow, comments.
triggers:
  keywords: [readability, naming, nesting, complexity, comments]
enforce: review
related: [principle-subtract-before-you-add, principle-model-the-domain, principle-explain-the-number]
sources:
  - title: Google Engineering Practices — What to look for in a code review
    url: https://google.github.io/eng-practices/review/reviewer/looking-for.html
status: verified
---
> Structure each unit so a reader needs the fewest facts held in mind at once.

## Patterns

- Prefer early returns when they clarify the main path; preserve cleanup and control-flow obligations.
- Extract named helpers when they reduce cognitive load, not merely to impose a uniform function size or abstraction level.
- Name by intent and role, with enough detail for the scope.
- Group related code in a navigable order consistent with the repository.
- Remove redundant comments; retain useful rationale, complex-algorithm explanations, and required API documentation.
- Make side effects and mutation visible in names and contracts; avoid surprising readers of lookup-like APIs.
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
