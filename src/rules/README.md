# Rules subsystem contract

The frozen authoring contract is `docs/authoring/CONTRACT.md`.

- All rules and principles frontmatter readers use `../lib/markdown-matter.js`. Executable frontmatter engines are rejected; unreadable status metadata remains `unknown`, never implicitly verified.
- Routing selects verified rules by language scope and keyword, symbol, or discriminative file evidence. Language-wide globs only provide language context; rules declaring only those triggers fail validation as unreachable.
- `phase` labels the plan (explicit or inferred). It does not filter rules. Rules have no phase-specific eligibility metadata.
- `flows` and `gates` are reserved, always-empty plan fields for compatibility. No flow runs and no gate is evaluated by the rules router.
- `enforce` and `tool` describe author-supplied enforcement metadata, not tool execution. The router treats all selected rules as review guidance.
- `baseline` must be the literal string `latest`. Unicode ellipses used as elisions are errors, per the frozen contract; ASCII elisions inside comments remain warnings. String literals and Markdown inline code are not anti-slop prose.
- Loader and validator share the same recursive regular-file collector. Reserved metadata files and symlinks are excluded. Malformed or mismatched IDs cannot satisfy `related` references.
- Existing packs require `INDEX.md`, `sources.md`, and `categories.md`. Index baseline and total/verified counts must match the pack. Rule links may be list, table, or plain Markdown links, including safe pack-relative nested paths and URL escapes. Absent language packs are not synthesized or required.
- Queue readers acquire the same lock as claims, including first-read state initialization. Lock recovery never uses age to evict known-live local processes or owners on another host. Legacy locks without a usable PID can expire by age; a confirmed dead local PID can be recovered immediately.

## Validation acceptance

- `validateAll` and `validatePack` are discovery APIs by default: an absent root or pack is reported as a warning so optional catalog discovery can continue. Pass `requireNonEmpty: true` when validation is an acceptance gate; a missing requested root/pack or zero rules passing validation is then an error.
- The validator checks only language packs that exist. A partial catalog is valid when its present packs pass; absent languages are not synthesized or required. The CLI always uses required validation for the requested root or `--lang` pack, and JSON output includes the resulting gate errors.
- `checkedCount` counts rules with no validation errors. With `--no-compile`, this is structure/contract validation only and does not prove snippets compile. `--strict` fails on snippets skipped because a compiler is unavailable; an explicit `compile_exempt` remains an exemption warning, not a missing-compiler failure.
