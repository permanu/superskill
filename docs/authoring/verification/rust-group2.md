# Verification Report - Rust Group 2 (`err`, `api`, `type`, `trait`, `serde`, `pat`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/rust/err-*.md` (12), `api-*.md` (17), `type-*.md` (13), `trait-*.md` (6), `serde-*.md` (8), `pat-*.md` (5) - 61 rules
- Toolchain: `rustc 1.94.0 (4a4ef493e 2026-03-02)`, `cargo 1.94.0`, `clippy 0.1.94`, edition 2024; upstream clone at provenance commit `fd2a861ab0406a4ac536a55274d14ea6fd1ca9c9`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-rust-g2` (snippets, cargo fixture, probes, drift report)

## Method

- Mechanical drift diff of all 61 catalog rules against the upstream files (pinned commit): 42 rules show diffs, all reviewed; they are fixture additions / `...`-elision replacements that make snippets self-contained, plus four renames (see Notes). Upstream meaning preserved; no meaning loss found.
- Extracted all 122 Bad/Good snippets and compiled them with `rustc --edition 2024 --crate-type lib --emit metadata` (with `fn main()` fallback for statement fragments) and, on unresolved-crate errors, a scratch cargo fixture (serde, serde_json, tokio, thiserror, anyhow, indexmap, regex, itertools, toml, reqwest, ...): **118/122 compile** (80 rustc, 38 cargo). The 4 failures are exactly the 4 `compile_exempt` rules, whose documented intentional errors were each reproduced with minimal probes.
- External URLs fetched: upstream rule URLs (all resolve; clone at pinned commit is byte-equivalent), `github.com/seanmonstar/reqwest/.../client.rs` (builder evidence), `github.com/launchbadge/sqlx/.../macros/mod.rs` (compile-time checked queries), plus the in-text `rust-lang.github.io/api-guidelines` citation (full `print.html` book searched).
- Semantics: claims checked against current std/clippy behavior on 1.94 (e.g. `Result` `#[must_use]` warning, `IntoIter::count` override in std source, nightly `default_field_values` still E0658, let-chains/`let-else` behavior, `matches!` clippy lint).
- Duplicates: cosine similarity over title+summary+Why for all 265 rust rules; closest in-group pairs are cross-linked and state distinct decisions; cross-pack anti-mirror overlaps noted.
- Deterministic validator: `node dist/rules/cli.js validate --lang rust --no-compile` -> 0 errors, 319 warnings (snippet-too-long / comment-elision / hedging / compile-exempt - all non-blocking per CONTRACT §12).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| rust-err-anyhow-app | verified | cargo compile (anyhow/toml/serde_json); upstream match. Drift note: Good `path.display()` -> `path` because fixture `find_config` returns `String`; context-chaining meaning preserved. |
| rust-err-context-chain | verified | cargo compile (anyhow/serde_json); upstream match. |
| rust-err-custom-type | verified | cargo compile (thiserror); upstream match. |
| rust-err-doc-errors | verified | rustc OK; claim backed by API Guidelines C-FAILURE ("Error conditions should be documented in an \"Errors\" section"). Note: 4 unresolved intra-doc links (`ParseError::Empty`...) because fixture `ParseError` is a unit struct; upstream docs were equally illustrative. |
| rust-err-expect-bugs-only | verified | cargo compile (regex/reqwest/serde_json). Drift note: `reqwest::get` -> `reqwest::blocking::get` (fixture; meaning preserved). |
| rust-err-from-impl | verified | cargo compile (serde_json). Drift note: upstream `diesel::result::Error` replaced by local `DbError` fixture; meaning preserved. |
| rust-err-lowercase-msg | verified | cargo compile (thiserror/serde_json); matches std error-message convention; upstream match. |
| rust-err-no-unwrap-prod | verified | rustc OK; four Good alternatives all compile; upstream match. |
| rust-err-question-mark | verified | cargo compile (serde/toml); upstream match. |
| rust-err-result-over-panic | verified | cargo compile (thiserror/serde_json); upstream match. |
| rust-err-source-chain | verified | cargo compile (thiserror/serde_json); `#[source]` chain semantics correct. |
| rust-err-thiserror-lib | verified | cargo compile (thiserror); upstream match. |
| rust-api-builder-must-use | verified | rustc OK; Bad drops builder silently (no lint), Good `#[must_use]` warns - behavior matches comments. |
| rust-api-builder-pattern | **rejected** | Good documents "Sets the maximum number of retries. Default is 3." but `#[derive(Default)] ClientBuilder` yields `max_retries = 0` and `build()` passes `self.max_retries` straight through (the `timeout` default of 30 s *is* implemented). Fix: hand-write `Default` with `max_retries: 3` or drop the doc claim. Upstream-inherited. |
| rust-api-common-traits | verified | compile_exempt; probe reproduces all documented errors: E0277 `Debug`, E0369 `==`, E0599 Hash-bounds, E0599 `clone`; Good compiles. |
| rust-api-default-impl | verified | compile_exempt; probe reproduces E0277 `Config: Default`; nightly note accurate (`default_field_values` still E0658 on 1.94); Good compiles. |
| rust-api-extension-trait | verified | compile_exempt; probe reproduces E0116 (inherent impl on foreign type) and E0117 (orphan rule); Good compiles. |
| rust-api-from-not-into | verified | rustc OK; blanket `impl<T, U> Into<U> for T where U: From<T>` claim correct; Bad's direct `Into` compiles as claimed. |
| rust-api-impl-asref | verified | rustc OK; `Cow<str>`, `&OsStr`, `PathBuf` all satisfy `AsRef` paths as shown. |
| rust-api-impl-fromiterator | verified | rustc OK; C-COLLECT backs `FromIterator`/`Extend`; all three `IntoIterator` reference forms compile and are exercised. |
| rust-api-impl-into | verified | rustc OK; `impl Into` call sites all infer correctly. |
| rust-api-must-use | **rejected** | Bad claims "No warning if Result ignored!" - false: `Result` is `#[must_use]` in std; probe on 1.94 emits `warning: unused `Result` that must be used` with no attribute. Fix: use a non-`must_use` return type for the "silent" half, or correct the comments. Upstream-inherited. |
| rust-api-newtype-safety | verified | rustc OK; swapped-argument misuse is a compile error in Good. |
| rust-api-non-exhaustive | verified | rustc OK; wildcard-required / constructor-only claims match language semantics. |
| rust-api-operator-overload | verified | rustc OK; C-OVERLOAD ("Operator overloads are unsurprising") backs the rule. |
| rust-api-parse-dont-validate | verified | rustc OK; cited sqlx source resolves and shows compile-time checked queries. |
| rust-api-sealed-trait | verified | rustc OK; private-supertrait sealing works as shown. |
| rust-api-serde-optional | verified | cargo compile; `cfg_attr` + `dep:serde` syntax current; feature-off path compiles. |
| rust-api-typestate | verified | rustc OK; invalid transition is a compile error as commented. |
| rust-type-deref-coercion | verified | rustc OK; C-DEREF ("Only smart pointers implement Deref and DerefMut") backs the rule. |
| rust-type-display-vs-debug | verified | rustc OK; Debug/Display responsibilities match std conventions. |
| rust-type-enum-states | verified | rustc OK; impossible-state examples correct. |
| rust-type-generic-bounds | verified | rustc OK; redundant-bound Bad and split-impl Good compile; consistent with C-STRUCT-BOUNDS. |
| rust-type-never-diverge | verified | rustc OK; `!` return-position usage stable and correct. |
| rust-type-newtype-ids | verified | rustc OK; mixed-ID call is a compile error as commented. |
| rust-type-newtype-validated | verified | rustc OK; construction-time validation pattern correct. |
| rust-type-no-stringly | verified | rustc OK; cross-pack overlap with `anti-stringly-typed` noted (same decision, anti-mirror). |
| rust-type-numeric-fmt | verified | rustc OK; C-NUM-FMT backs; printed hex/octal/binary values recomputed and correct. |
| rust-type-option-nullable | verified | rustc OK; sentinel/raw-pointer Bad and Option Good behave as stated. |
| rust-type-phantom-marker | verified | compile_exempt; probe reproduces E0392; Good compiles. Note: Bad aside "requires T: Default" is inaccurate (`Option<T>` has a blanket `Default` impl and needs no bound); suggest dropping that clause in a cleanup pass. |
| rust-type-repr-transparent | verified | rustc OK; edition-2024 `unsafe extern` form used; layout claims correct. |
| rust-type-result-fallible | verified | cargo compile (serde/toml); error-type design idiomatic. |
| rust-trait-associated-type-vs-generic | **rejected** | Why claims "The Rust API Guidelines (rust-lang.github.io/api-guidelines/future-proofing.html) capture the rule: prefer associated types when there is a single natural output per implementor." Full-text search of the API Guidelines book (print.html, all chapters) finds no associated-type-vs-generic guidance - "associated type" appears only in the C-STRUCT-BOUNDS exception list; the page cited contains C-SEALED/C-STRUCT-PRIVATE/C-NEWTYPE-HIDE/C-STRUCT-BOUNDS. Fix: cite a source that states the rule (e.g. std `Iterator`/`ops::Add` docs or the Rust Reference associated-items chapter) or drop the attribution. Snippets compile and the advice itself is sound. Upstream-inherited. |
| rust-trait-blanket-impl | verified | rustc OK; E0119 conflict claim correct; ToString mirror accurate. |
| rust-trait-coherence-newtype | verified | rustc OK; orphan-rule claims correct; `#[repr(transparent)]` newtype compiles. |
| rust-trait-default-methods | verified | rustc OK; `IntoIter::count` override claim confirmed in std source (`library/alloc/src/vec/into_iter.rs`). |
| rust-trait-dyn-vs-generic | verified | rustc OK; dispatch trade-off statements accurate. |
| rust-trait-object-safety | verified | rustc OK; E0038 claim correct; "dyn-compatible" current terminology; `where Self: Sized` gating works. |
| rust-serde-custom-with | verified | cargo compile (serde/serde_json); `with`/`serialize_with` semantics correct. |
| rust-serde-default-compat | verified | cargo compile; container/field defaults behave as documented. |
| rust-serde-deny-unknown-fields | verified | cargo compile; typo rejected in Good, ignored in Bad - behavior asserted in snippets. |
| rust-serde-enum-representation | verified | cargo compile; all four tagging wire formats accurate (tuple variant caveat for internal tagging correct). |
| rust-serde-flatten | verified | cargo compile; flatten wire-format claim accurate; deny_unknown_fields incompatibility correct. |
| rust-serde-rename-all | verified | cargo compile; camelCase/SCREAMING_SNAKE_CASE mappings correct. |
| rust-serde-skip-empty | verified | cargo compile; omission behavior correct (manual `Default` impl is harmless). |
| rust-serde-try-from-validate | verified | cargo compile; `try_from`/`into` round-trip and rejection asserted in snippets. |
| rust-pat-at-bindings | verified | rustc OK; match-ergonomics `@` binding compiles and demonstrates the claim. |
| rust-pat-exhaustive-enum | verified | rustc OK; wildcard-hides-variant claim correct. |
| rust-pat-if-let-chains | **rejected** | CONTRACT §8 ("no version numbers anywhere in rules"): Why contains "stabilized in Rust 1.88 under the 2024 edition". Otherwise sound (let-chains compile under edition 2024; semantics correct). Fix: drop the version parenthetical. Upstream-inherited. |
| rust-pat-let-else | **rejected** | CONTRACT §8: Why contains "stable since Rust 1.65". Otherwise sound (snippet compiles; divergence requirement correct). Fix: drop the version parenthetical. Upstream-inherited. |
| rust-pat-matches-macro | verified | clippy 0.1.94 emits `match_like_matches_macro` 3x on Bad, 0x on Good; tool id `clippy::match_like_matches_macro` confirmed. |

## Rejected rules - detail

| rule id | blocker | trivial fix |
|---|---|---|
| rust-api-builder-pattern | Good doc/impl mismatch: retries default documented as 3, implemented as 0 | implement `Default` for `ClientBuilder` with `max_retries: 3`, or remove the claim |
| rust-api-must-use | Bad states ignored `Result` produces no warning; it does (std `#[must_use]`) | make the "silent" half return a custom non-`must_use` type, or correct the comments |
| rust-trait-associated-type-vs-generic | in-text API Guidelines citation does not contain the rule (full-book search) | replace with a source that states it, or drop the attribution |
| rust-pat-if-let-chains | version number in Why (CONTRACT §8) | remove "(stabilized in Rust 1.88 under the 2024 edition)" |
| rust-pat-let-else | version number in Why (CONTRACT §8) | remove "(stable since Rust 1.65)" |

## Cross-cutting checks

- Compile: 118/122 snippets compile (80 via bare rustc, 38 via cargo fixture); the 4 failures are the 4 `compile_exempt` rules, each with its documented intentional error reproduced by probe (E0277/E0369/E0599, E0277, E0116+E0117, E0392). Verified `Good` snippets all compile.
- Sources: all 61 upstream URLs resolve and match the pinned clone; the 2 external source URLs (reqwest, sqlx) resolve and support their rules; one in-text URL fails (rejected `trait-associated-type-vs-generic`).
- Adaptation: 42/61 rules differ from upstream only by fixture/elision-replacement edits; four renames (`path.display()`->`path`, `reqwest::get`->`blocking::get`, diesel->`DbError`, chained builder calls); all preserve upstream meaning.
- Formatting: `baseline: latest` on all 61; one `rust` fence per Bad/Good; See Also and `related` all resolve (validator 0 errors); version-number violations found and rejected in 2 rules.
- Duplicates: no in-group duplicates. Closest pairs are deliberate and cross-linked: `api-from-not-into`/`api-impl-into` (direction vs parameter flexibility), `trait-dyn-vs-generic`/`trait-object-safety` (choose dispatch vs keep dyn-compatible), `serde-deny-unknown-fields`/`serde-flatten` (explicitly incompatible). Cross-pack: the `anti-*` mirror rules restate four of this group's decisions (`anti-unwrap-abuse`~`err-no-unwrap-prod`, `anti-panic-expected`~`err-result-over-panic`, `anti-expect-lazy`~`err-expect-bugs-only`, `anti-stringly-typed`~`type-no-stringly`); upstream ships both as separate categories (Anti-patterns is a REFERENCE category), so these were treated as intentional companions - owner may want to merge the tightest pairs.
- Tool ids: `clippy::match_like_matches_macro` verified live; no other rule in the group claims `enforce: tool`.

## Notes / follow-ups (outside verifier ownership)

- `INDEX.md` (`verified: 0`) and `categories.md` are stale after this batch: group 2 now has 56 verified, 5 draft. Owner must update.
- `err-doc-errors` Good has 4 unresolved intra-doc links (fixture `ParseError` should be an enum with `Empty`/`InvalidFormat`/`Overflow`/`NotPositive`).
- `type-phantom-marker` Bad aside "requires T: Default" is inaccurate.
- Rejected rules need only the listed fixes, then re-verification; none is structurally broken.

## Counts

- Verified: 56/61 (flipped to `status: verified`)
- Rejected: 5 (`rust-api-builder-pattern`, `rust-api-must-use`, `rust-trait-associated-type-vs-generic`, `rust-pat-if-let-chains`, `rust-pat-let-else`) - left `status: draft`
- Blockers: the five trivial fixes above; INDEX/categories counts for the owner

## Addendum (2026-10-05) - Re-verification of the five rejected rules

All five fixes were applied by the owner and re-checked against the same toolchain (rustc 1.94.0, edition 2024); snippets re-extracted and recompiled.

| rule id | verdict | evidence |
|---|---|---|
| rust-api-must-use | verified | Bad now uses `EmailReceipt` (no `#[must_use]`) and `u32`: rustc emits **0** "must be used" warnings on Bad and exactly the two documented ones on Good - `unused `EmailReceipt` that must be used` and `unused return value of `compute_checksum` that must be used`. |
| rust-api-builder-pattern | verified | Hand-written `Default for ClientBuilder` sets `max_retries: 3`; runtime probe on a default-built client asserts retries == 3 and timeout == 30 s, matching both doc lines; both snippets compile. |
| rust-trait-associated-type-vs-generic | verified | Unsupported API Guidelines sentence replaced by a rule-of-thumb grounded in the paragraph's own reasoning; no URL remains in the text; both snippets compile; advice demonstrated by the std `Iterator`/`ops::Add` mirrors. |
| rust-pat-if-let-chains | verified | Version number removed ("stable on the current baseline"); compiles under edition 2024; runtime probe confirms chain behavior (`Some("5")/10` -> `valid: 5`; `5/3`, `"abc"`, `None` -> `None`). |
| rust-pat-let-else | verified | Version number removed ("stable on the current baseline"); compiles; runtime probe confirms extraction behavior (`Some("5")` -> `Some(10)`; `"0"`, `None` -> `None`). |

- Re-checked: no version numbers remain in any of the five files; structural validator over all 265 rust rules: 0 errors, 319 warnings.
- Updated counts: group 2 scope **61/61 verified, 0 rejected** (err 12, api 17, type 13, trait 6, serde 8, pat 5).
- `INDEX.md` (`verified: 0`) and `categories.md` remain stale; owner must update to the final pack counts.
