# Atomic Rules — Authoring Contract

**Version:** 1.1 (shared-control extension 2026-10-16)
**Applies to:** `catalog/rules/**` and every authoring/verification agent.

## 0. What a rule is

One rule = one falsifiable decision, expressed as an atomic, sourced artifact. Language adapters have compilable examples; shared controls have language-neutral, concrete Bad/Good scenarios. Rules are never loaded in bulk; a deterministic router selects them per task. A rule that has not been adversarially verified does not ship as `verified`.

Non-negotiables:

1. One idea per file. Two ideas = two files.
2. Every rule cites at least one primary source URL.
3. Language Bad/Good snippets are self-contained and compile. Shared Bad/Good scenarios use `text`, state observable outcomes, and undergo independent adversarial review; they are not compiler evidence.
4. No placeholders, no TODOs, no hedging in the summary.
5. `status: draft` until an independent verifier flips it.

## 1. Layout

```
catalog/rules/<lang>/
  INDEX.md               # one-line summaries, grouped by prefix
  sources.md             # pinned baseline + authoritative sources
  categories.md          # category plan with target counts (~265 total)
  <prefix>-<name>.md     # atomic rule
```

Language codes: `rust typescript python go swift java c cpp`.

`catalog/rules/shared/` holds language-independent invariants once. Use `lang: shared`, `shared-<prefix>-<name>` IDs, `enforce: review`, and fenced `text` scenarios. No `tool` or `compile_exempt` claims. Each language can reference these IDs through `related`; keep only its implementation-specific mechanics and examples in the adapter. Referenced verified shared controls are loaded one hop, deduplicated and within the same budget when an adapter matches. Direct shared matches still require task/file triggers; neither project domain nor language selection bulk-loads this directory.

## 2. File names and IDs

- File: `<prefix>-<name>.md`; `name` is kebab-case, unique within `lang + prefix`.
- ID: `<lang>-<prefix>-<name>` (globally unique; used in `related`, plans, citations).
- Example: `catalog/rules/typescript/err-boundary-parse.md` -> `typescript-err-boundary-parse`.

## 3. Frontmatter (YAML)

| Field | Type | Required | Rules |
|---|---|---|---|
| id | string | yes | `<lang>-<prefix>-<name>`; must match path |
| lang | enum | yes | rust/typescript/python/go/swift/java/c/cpp/shared |
| prefix | string | yes | from taxonomy (section 6) |
| title | string | yes | one sentence describing the decision (not the mechanism) |
| severity | must/should/prefer | yes | must = correctness/safety/data loss; should = idiomatic default; prefer = taste |
| enforce | tool/review/both | yes | tool when a linter/compiler enforces it (add `tool` id for tool or both); review otherwise; descriptive metadata, not automatic execution |
| tool | string | no | e.g. `clippy::needless_return`, `ruff:TRY003`, `eslint:@typescript-eslint/no-explicit-any` |
| compile_exempt | string | no | reason the Bad/Good snippets intentionally do not compile (e.g. demonstrating a compiler error, nightly-only feature). The validator skips the compile check with a warning; such rules stay `draft` until a verifier explicitly approves them |
| baseline | string | yes | the literal string `latest` (section 8) |
| status | draft/verified | yes | section 7 |
| triggers.keywords | string[] | no | task words (2-8) |
| triggers.files | string[] | no | globs, normally `["**/*.<ext>"]` |
| triggers.symbols | string[] | no | API symbols (e.g. `Promise`, `Arc`) |
| related | string[] | no | rule IDs (must resolve) or `external:<url>` |
| sources | {title,url}[] | yes | at least 1; section 5 |

## 4. Body

Exact order:

```
> One-line imperative summary (at most 30 words, no hedging).

## Why

2-5 sentences. The failure the rule prevents and the invariant it protects.

## Bad

Fenced code block with a complete, compilable anti-pattern snippet (target ≤ 25 lines; over-length is a warning).

## Good

Fenced code block with a complete, compilable recommended snippet (target ≤ 25 lines; over-length is a warning).

## See Also

- [<id>](<file>.md) - one clause on the relation
```

- Exactly one `## Bad` and one `## Good`; each contains exactly one non-empty fenced block. Language adapters use their language tag; shared controls use `text` with observable inputs/outcomes.
- Snippets are complete at declaration level: no `...` elisions. Imports/includes only where needed. Snippets may be declaration-level (functions, types, methods); the harness wraps them as needed (Go `package main`, Java class/`main`, C/C++ `main` around statements). They must never rely on surrounding application context.
- `## See Also` is present whenever anything related exists; omit only when genuinely nothing relates.

## 5. Source policy

- At least one primary source per rule: official docs, official style guides/API guidelines, RFCs/JEPs/PEPs, standards drafts.
- Blog posts and community articles are allowed only as secondary support; if a primary source does not back it, the rule stays `draft`.
- URLs must resolve (fetched during authoring). Never invent URLs.
- State a language-independent control once in `shared`; source and verify implementation-specific claims in language adapters. A shared scenario does not establish that every language implementation is correct.

## 6. Prefix taxonomy

Shared core (use where applicable):
`type, err, mem, api, async, conc, perf, test, doc, obs, sec, style, proj, lint, anti, data, num, conv, pat, macro, const, io, net, ui, ffi`

Language extensions are allowed but must be declared in that language's `categories.md`. Rust extensions (from the adapted upstream pack): `own, unsafe, serde, coll, closure, opt, trait, name`.

## 7. Status lifecycle

- `draft` — authored and passing the deterministic validator.
- `verified` — an independent verifier (fresh context, adversarial prompt) has confirmed: (a) the Why matches the cited source; (b) both language snippets compile and are idiomatic, or shared text scenarios express a falsifiable invariant with concrete counterexamples; (c) the rule is not a duplicate; (d) the summary matches the body. Shared rules do not run through a language compiler and must not be reported as compiled.
- Only `verified` rules are injected into model context by default; drafts are pull-only.

## 8. Baseline policy

Rules target the **latest stable** of their language. Do not write version numbers anywhere in rules or indexes.

- Frontmatter: `baseline: latest` (required; the literal string).
- `sources.md`: `Baseline: latest`; you may additionally record which versions the cited sources currently show, for traceability only.
- Author against current stable idioms. Preview/experimental features are never the default: omit them, or keep the rule `status: draft` with the caveat stated in `Why`.
- Compile checks use whatever toolchain the environment provides; the verifier records the toolchain version used. Inspect `.github/workflows/ci.yml` for the actual CI versions: a pinned or available compiler is not evidence of compatibility with the latest stable release. A rule whose examples cannot be checked locally stays `draft` until its required compile evidence exists.

## 9. INDEX.md

```
# <Language> Rules Index

Baseline: latest
Rules: <n> (verified: <m>)

## err - Error handling (<n>)

- [err-rule-name](err-rule-name.md) - one-line summary
```

Grouped by prefix, alphabetical. The directory file list must match the index exactly (validator-checked).

## 10. sources.md

```
# <Language> - Sources

Baseline: latest
Last verified: <date>

## Primary

- [Title](url) - what it informs (prefixes/categories)

## Further reading

- [Title](url)
```

## 11. categories.md

| prefix | title | target | primary sources |
|---|---|---|---|
| err | Error handling | 12 | 1,2 |

Targets sum to approximately 265 (rust-skills parity). Adjust per language where a category does not apply.

## 12. Anti-slop requirements

- Errors: TODO/FIXME/XXX/TBD; bare elision lines (a line whose entire content is `...`); Unicode ellipsis used as an elision; unquoted YAML type traps (`NULL`, `null`, `[[nodiscard]]` as bare values).
- Warnings (do not block verification): `...` inside comments (`// ...`, `# ...`, `/* ... */`); snippets longer than 25 lines; hedging phrases ("consider / might / often"); "as needed" without a condition.
- No claim that a linter enforces something unless `enforce: tool` is set with a `tool` id.
- `enforce: tool|both` is reserved metadata; the router does not act on it — treat it as `review` today.
- No duplicate rules; near-duplicates are merged or one is deleted.
- Prefer fewer, sharper rules. A vague rule is worse than no rule.

## 13. Verification

- Deterministic validator: `node dist/rules/cli.js validate [--lang <lang>] [--json] [--no-compile]` (owned by `src/rules/`).
- Adversarial verifier: separate agent, fresh context, only the rule + its cited sources; flips `status` to `verified` only when all checks in section 7 pass.

### Evidence boundaries

- `--no-compile` proves structural checks only. A skipped toolchain, missing dependency, or `compile_exempt` warning is not a successful compile. Use `--strict` for required toolchains and record exemptions explicitly.
- The deterministic validator checks source URL shape, not source availability or semantic support. Record the fetched primary URL, date, relevant claim, and verifier judgment separately. A passing validator does not grant `verified` status.
- `enforce: tool|both` requires a `tool` id but does not run that tool. Record the actual linter/compiler invocation when claiming tool enforcement; review-only checks remain agent judgments.
- Verification notes identify files, verifier, toolchain, exact commands, outcomes, exemptions, and unresolved findings. Do not imply that a prompt checklist, cached result, or another revision's run is fresh execution evidence.
- Version and digest pins for harness dependencies are operational supply-chain metadata, not language-baseline claims. Keep reviewed digests in source control, verify fresh and cached bytes, and record the upstream checksum source when changing them. Never promote a first-use cache digest into a trusted pin.
