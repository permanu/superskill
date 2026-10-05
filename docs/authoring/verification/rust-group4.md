# Verification Report - Rust Group 4 (`async`, `proj`, `lint`, `test`, `doc`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/rust/<prefix>-*.md` for the 5 prefixes above = 72 rules (18 `async`, 14 `proj`, 13 `lint`, 15 `test`, 12 `doc`); all entered as `status: draft`
- Toolchain: `rustc 1.94.0 (4a4ef493e 2026-03-02)`, `cargo 1.94.0`, `clippy 0.1.94`, edition 2024, macOS; upstream at provenance commit `fd2a861ab0406a4ac536a55274d14ea6fd1ca9c9`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-rust-g4` (upstream copies, snippets, cargo fixture, clippy probes, doctest harness)
- Ownership: flipped `status` to `verified` on 55 rules; 17 left `draft`. No other edits; no git.

## Method

1. Fetched all 72 upstream rule URLs (`raw.githubusercontent.com/.../rules/<file>.md` at both `master` and the pinned commit; the two are byte-identical for all 72). Diffed every local Why/Bad/Good against upstream (fallback sections mapped per `rust-provenance.md`), so all 72 adaptations were checked, not sampled.
2. Extracted all 144 Bad/Good snippets and compiled them with the contract harness: `rustc --edition 2024 --crate-type lib --emit metadata`, statement fragments wrapped in `fn main()`, and on unresolved-crate errors a warmed cargo fixture (serde, serde_json, tokio full, tokio-util, thiserror, anyhow, futures, criterion, proptest, tempfile, mockall, insta, async-trait, log, tracing, tracing-subscriber, env_logger, reqwest blocking, loom, autocfg). Additionally compiled every snippet with `--test` (rustc) / `cargo test --no-run` (cargo) to exercise `#[cfg(test)]`/`#[test]`-gated bodies that lib mode silently drops.
3. `doc-crate-readme` Good compiled in a scratch crate providing `README.md` (its `compile_exempt` is accurate); `lint-deny-correctness` Bad (compile-exempt) probed line by line.
4. Verified all declared tool ids live against clippy 0.1.94 (`#![warn(...)]` probe, no "unknown lint"), and reproduced lint behavior for `lint-deny-correctness` and `lint-warn-suspicious`.
5. Fetched the 2 external source URLs (`serde.rs`, tokio `benches/sync_mpsc.rs`; both HTTP 200) and checked they support the rules.
6. Ran `rustdoc --test` on doc-carrying snippets as supplementary evidence (see notes), and `node dist/rules/cli.js validate --lang rust --no-compile`: 0 errors and 99 warnings in scope (all non-blocking per CONTRACT §12: comment-elisions, hedging in Why, over-length, compile-exempt).
7. Mechanical checks: `baseline: latest`, id/path match, summary <= 30 words, Why 2-5 sentences, exactly one `rust` fence per Bad/Good, `related` ids + See Also links + INDEX parity (all resolve; 265 index entries), near-duplicate scan (title+summary Jaccard).

## Compile results

- Specified lib compile: **141/144** snippets pass as-is; `doc-crate-readme` Good passes once a `README.md` fixture exists (compile-exempt accurate); `lint-deny-correctness` Bad is compile-exempt; **1 genuine failure**: `proj-feature-additive` Good — cargo fixture `error[E0433]: failed to resolve: use of unresolved module or unlinked crate 'alloc'` (no_std path lacks `extern crate alloc;`).
- Supplementary `--test` compile: 8 further failures across 5 rules — the test bodies reference items from surrounding application context (`User`/`UserError`, `divide`, `AppError`/`Config`, `fetch_data`/`fetch_user`, `crate::my_module`), which lib mode never type-checks because `#[test]` items are cfg(test)-gated (probe: a `#[test] fn` with `undefined_fn()` compiles rc=0; its marker string is absent from a release binary and present with `--test`). CONTRACT §4 requires snippets to be self-contained; these 5 rules are rejected.
- `lint-deny-correctness` intentional errors reproduced: E0308 (assignment in condition), E0597 (use-after-free), plus live clippy correctness lints (`invalid_nan_comparisons`, `impossible_comparisons`, `overly_complex_bool_expr`).

## Version numbers (CONTRACT §8)

Rejected 6 rules whose prose (summary/Why) carries version numbers, matching the cpp-batch2 / rust-group2 / rust-group3 precedent:
`async-async-fn-bounds` ("stabilized in Rust 1.85"), `async-fn-in-trait` (title/summary "(stable 1.75)", Why "Since Rust 1.75"), `doc-crate-readme` ("stable since Rust 1.54"), `lint-cfg-check` ("stabilized in Rust 1.80"), `lint-workspace-lints` ("Rust 1.74+"), `proj-workspace-deps` ("Rust 1.64+").
Non-blocking notes: version literals inside Cargo.toml/MSRV *example data* in `doc-cargo-metadata`, `lint-cargo-metadata`, `proj-build-rs-minimal` (the anti-pattern itself parses `"1.8"`), `proj-msrv-declare` (`rust-version = "1.80"` is the demonstrated field); these are example values, not baseline claims.

## Duplicates and consistency

- In-group near-duplicate: `doc-link-types` restates `doc-intra-links` (title+summary Jaccard 0.55; both decisions are "use intra-doc links instead of plain text"); rejected per CONTRACT §12 (merge or delete one; keep the broader `doc-intra-links`). Other >=0.5 pairs (`lint-warn-complexity`/`lint-warn-style`, `doc-errors-section`/`doc-safety-section`) are parallel-but-distinct decisions.
- Cross-pack, reported not blocking: `doc-errors-section` ~ `err-doc-errors` (same decision, different prefix; flag for the owner), and the anti-mirror pair `async-no-lock-await` ~ `anti-lock-across-await` (treated as intentional companions per rust-group2 precedent).

## Adaptation fidelity

- 72/72 upstream URLs resolve; master == pinned commit. Why is verbatim for 71/72 (`lint-deny-correctness` adds a compile-exempt disclosure note). Bad/Good differ from upstream by fixture/elision-replacement edits that make snippets self-contained; meaning preserved except:
  - `proj-mod-rs-dir` — rejected: upstream recommends the adjacent-file style for small modules ("When to Use Each") and its "Adjacent File Benefits" list was used verbatim as the Bad; the local rule presents the alternative style's *benefits* as the anti-pattern (inverted framing), and the Bad's "Matches Rust 2018+ default lint preference" is unsupported (both `mod_module_files` and `self_named_module_files` are allow-by-default clippy lints).
  - `async-clone-before-await` — rejected: the Bad claims E0277 ("future cannot be sent") but the snippet compiles, `tokio::spawn` included, because `&[Item]` is `Send` when `Item: Sync`; the demonstration does not exhibit the failure, and the summary overstates by implying all borrows across await are unsafe.
  - `async-broadcast-pubsub` — note: upstream's `let mut rx2 = ???` became a commented-out `rx.clone()` line, so the Bad no longer shows two consumers; the comment carries the point.
  - `test-fixture-raii` Bad — good edition-2024 adaptation (`set_var`/`remove_var` wrapped in `unsafe` with SAFETY notes).

## Sources

- `doc-intra-links` second source `https://serde.rs` is an example link-reference target from upstream (`/// [`serde`]: https://serde.rs`), not a supporting source for intra-doc links; harmless but should be dropped.
- `test-criterion-bench` second source (tokio `benches/sync_mpsc.rs`) resolves and shows real criterion usage; supports the rule.
- Primary-source mapping remains pack-wide debt (most rules cite only the upstream file); consistent with `rust-provenance.md` known debt and the other groups' reports.

## Tool ids

All 11 declared ids verified live (no "unknown lint"): `clippy::cargo`, `clippy::nursery`, `clippy::correctness`, `clippy::pedantic`, `clippy::complexity`, `clippy::perf`, `clippy::style`, `clippy::suspicious`, `rustc::unexpected_cfgs`, `rustc::missing_docs`, `rustfmt`; also `clippy::undocumented_unsafe_blocks`, `significant_drop_tightening`, `redundant_clone`, `use_self`, `redundant_else`, `or_fun_call` (all real; `or_fun_call` fires under nursery, not perf). `lint-unsafe-doc` rejected for claiming a lint's enforcement with `enforce: review` (same class as rust-group3's `name-*` rejections). `lint-warn-suspicious` rejected because its Good offers `clippy.toml` `warn = ["clippy::suspicious"]`, which clippy 0.1.94 rejects: `error reading Clippy's configuration file: unknown field 'warn'` (stale pre-1.0 syntax, inherited from upstream).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| rust-async-async-fn-bounds | **rejected** | CONTRACT §8: Why "stabilized in Rust 1.85 (February 2025)". Otherwise sound (both snippets compile; AsyncFn semantics correct). |
| rust-async-bounded-channel | verified | Both compile (cargo/tokio); backpressure claim matches Tokio channel docs; upstream match. |
| rust-async-broadcast-pubsub | verified | Both compile; broadcast-vs-mpsc semantics correct. Note: Bad's `rx.clone()` line is commented out, so the two-consumer failure is only in comments. |
| rust-async-cancel-safety | verified | Both compile; `read_exact` vs `read` cancellation-safety matches Tokio docs; severity must appropriate. |
| rust-async-cancellation-token | verified | Both compile (tokio-util); drop-detaches / cooperative-cancel claims correct. |
| rust-async-clone-before-await | **rejected** | Bad claims E0277 that does not occur: snippet (incl. `tokio::spawn(process(data))`) compiles; `&[Item]` is Send because `Item: Sync`. Summary overstates. Fix: demonstrate with a non-Sync type or narrow the claim. |
| rust-async-fn-in-trait | **rejected** | CONTRACT §8: title/summary "(stable 1.75)" and Why "Since Rust 1.75". Snippets otherwise correct (native AFIT vs async_trait). |
| rust-async-join-parallel | verified | Both compile (cargo/tokio); `join!`/`try_join!` concurrency semantics correct. |
| rust-async-joinset-structured | verified | Both compile; JoinSet dynamic-set claims correct. |
| rust-async-mpsc-queue | verified | Both compile; std-mpsc-blocks-executor claim correct. |
| rust-async-no-lock-await | verified | Both compile; guard-across-await deadlock/starvation claim correct. Cross-pack anti-mirror `anti-lock-across-await` flagged (intentional). |
| rust-async-oneshot-response | verified | Both compile; oneshot request/response claims correct. |
| rust-async-select-racing | verified | Both compile; select-racing/timeout semantics correct. |
| rust-async-spawn-blocking | verified | Both compile; blocking-thread-pool claims correct. |
| rust-async-tokio-fs | verified | Both compile; std::fs blocks executor / tokio::fs wraps spawn_blocking correct. |
| rust-async-tokio-runtime | verified | Both compile; flavor/worker_threads configuration claims correct. |
| rust-async-try-join | verified | Both compile; fail-fast vs join! semantics correct. |
| rust-async-watch-latest | verified | Both compile; watch latest-value/no-lag claims correct. |
| rust-proj-bin-dir | verified | Comment-only fences compile; src/bin auto-target claim matches Cargo docs. |
| rust-proj-build-rs-minimal | verified | Both compile (cargo/autocfg/reqwest); rerun-directive/capability-probe claims correct. Note: `"1.8"` version literal is the anti-pattern itself. |
| rust-proj-feature-additive | **rejected** | Good fails compile: `error[E0433]: use of unresolved module or unlinked crate 'alloc'` in the no_std path (needs `extern crate alloc;`). Additive-features decision itself sound. |
| rust-proj-flat-small | verified | Comment-only fences compile; guidance sound. |
| rust-proj-lib-main-split | verified | Both compile (cargo/anyhow); lib-for-testability claim matches integration-test visibility rules. |
| rust-proj-mod-by-feature | verified | Comment-only fences compile; feature-vs-type organization guidance sound. |
| rust-proj-mod-rs-dir | **rejected** | Adaptation inverted upstream meaning: upstream recommends adjacent-file style for small modules; local uses its benefits list as the Bad. Bad's "Matches Rust 2018+ default lint preference" unsupported. |
| rust-proj-msrv-declare | verified | Both compile; `rust-version` error behavior and resolver-3 MSRV-aware resolution correct. Note: `"1.80"` literals are demonstrated MSRV data. |
| rust-proj-prelude-module | verified | Both compile; prelude re-export pattern correct. |
| rust-proj-pub-crate-internal | verified | Both compile; visibility-boundary claims correct. |
| rust-proj-pub-super-parent | verified | Both compile; `pub(super)` semantics correct. |
| rust-proj-pub-use-reexport | verified | Both compile; flat-API re-export pattern correct. |
| rust-proj-workspace-deps | **rejected** | CONTRACT §8: Why "dependency inheritance (Rust 1.64+)". Otherwise sound (workspace inheritance syntax current). |
| rust-proj-workspace-large | verified | Comment-only fences compile; workspace claims match Cargo docs. |
| rust-lint-cargo-metadata | verified | Both compile; `clippy::cargo` id live; group checks (wildcard/negative-feature) accurate. Note: `version = "0.1.0"` is example data. |
| rust-lint-cfg-check | **rejected** | CONTRACT §8: Why "(stabilized in Rust 1.80)". Otherwise sound (`check-cfg` syntax valid, typo catch accurate). |
| rust-lint-clippy-nursery-selected | verified | Both compile; nursery id live; listed lints real (`or_fun_call` fires under nursery, not perf). |
| rust-lint-deny-correctness | verified | compile-exempt approved: E0308 + E0597 and clippy correctness lints reproduced. Notes: "infinite iterator" annotation is not a lint/compile error (`repeat` loop), and `x` is undefined in several lines. |
| rust-lint-missing-docs | verified | Both compile; `rustc::missing_docs` id live; warning behavior matches. Note: Good doctest calls `process()` unimported (illustrative). |
| rust-lint-pedantic-selective | verified | Both compile; pedantic id live; allow-list approach correct. |
| rust-lint-rustfmt-check | verified | Both compile; `cargo fmt --check` CI claim correct; `rustfmt` tool id valid. |
| rust-lint-unsafe-doc | **rejected** | Why claims a lint ensures SAFETY comments while `enforce: review` (CONTRACT §3/§12). Fix: `enforce: tool` + `tool: clippy::undocumented_unsafe_blocks` (id verified live) or drop the claim. |
| rust-lint-warn-complexity | verified | Both compile; complexity id live; lint examples fire as commented (probes). Hedge "often" in Why (non-blocking). |
| rust-lint-warn-perf | verified | Both compile; perf id live; examples are allow-by-default perf lints as annotated. |
| rust-lint-warn-style | verified | Both compile; style id live; examples fire as annotated. |
| rust-lint-warn-suspicious | **rejected** | Good's `clippy.toml` `warn = ["clippy::suspicious"]` is invalid on clippy 0.1.94 (`unknown field 'warn'`); stale syntax inherited from upstream. Other two mechanisms valid. |
| rust-lint-workspace-lints | **rejected** | CONTRACT §8: Why "Workspace-level lints (Rust 1.74+)". Otherwise sound. |
| rust-test-arrange-act-assert | **rejected** | `--test` compile: `E0433: use of undeclared type 'User'` (Bad and Good) — snippet relies on surrounding context (CONTRACT §4); lib mode passes only because `#[test]` items are dropped. |
| rust-test-cfg-test-module | verified | Both compile (lib and --test). Note: Bad's "Included in release build!" is inaccurate for `#[test]` items (they are cfg(test)-gated); the module/helpers case is the real hazard. |
| rust-test-criterion-bench | verified | Bad compiles; Good compiles with criterion 0.5.1 (harness pin) and latest 0.8.2. Note: `criterion::black_box` is deprecated on latest (use `std::hint::black_box`). |
| rust-test-descriptive-names | verified | Both compile; naming guidance sound. |
| rust-test-doctest-examples | verified | Both compile; Good doctests pass under `rustdoc --test`. Note: Bad's "Wrong number of args - not caught!" is false — the fenced block is compiled and fails (caught). |
| rust-test-fixture-raii | verified | Both compile; RAII cleanup correct; edition-2024 `unsafe` env handling correct. Good is 50 lines (non-blocking). |
| rust-test-integration-dir | verified | Both compile; tests/ public-API semantics correct. |
| rust-test-loom-concurrency | verified | Both compile; loom `cfg(loom)` gating pattern correct. |
| rust-test-mock-traits | verified | Both compile (cargo/async-trait/tokio); trait-extraction guidance correct. Good is 100 lines (non-blocking). |
| rust-test-mockall-mocking | verified | Both compile (cargo/mockall); automock usage correct; adaptation-authored Bad disclosed and sound. |
| rust-test-proptest-properties | verified | Both compile (cargo/proptest); property-based rationale correct; adaptation-authored Bad disclosed and sound. |
| rust-test-should-panic | **rejected** | `--test` compile: `E0425: cannot find function 'divide'` (Bad and Good); snippet not self-contained (CONTRACT §4). |
| rust-test-snapshot-testing | **rejected** | `--test` compile: Bad `E0433` for undeclared `AppError`/`Config`; Good defines them (Good passes). Fix: add fixture types to Bad. |
| rust-test-tokio-async | **rejected** | `--test` compile: `E0425` for undeclared `fetch_data`/`fetch_user` (Bad and Good); snippet not self-contained (CONTRACT §4). |
| rust-test-use-super | **rejected** | `--test` compile: Bad `E0432: unresolved import 'crate::my_module'`; snippet not self-contained (CONTRACT §4). |
| rust-doc-all-public | verified | Both compile; Good doctest passes under `rustdoc --test`. |
| rust-doc-cargo-metadata | verified | Comment-only fences compile; metadata fields match Cargo/crates.io docs. Notes: `rust-version = "1.70"`/`version = "0.1.0"` example data; `edition = "2021"` is stale-flavored for a metadata example. |
| rust-doc-crate-readme | **rejected** | CONTRACT §8: Why "(stable since Rust 1.54)". compile-exempt accurate (Good compiles with README fixture). |
| rust-doc-errors-section | verified | Both compile; `# Errors` convention matches API Guidelines. Notes: hedge "might" in Why (non-blocking); intra-doc links to nonexistent enum variants; cross-pack duplicate of `err-doc-errors` flagged. |
| rust-doc-examples-section | verified | Both compile. Note: Good doctests fail under `rustdoc --test` (`Foo::name`/`is_empty` undefined) — illustrative references to a surrounding crate. |
| rust-doc-hidden-setup | verified | Both compile. Note: Good doctest fails (hidden setup references `Config` fields and `Processor::new`/`Item::new` not defined in the snippet). Hedge "often" in Why. |
| rust-doc-intra-links | verified | Both compile; intra-doc link forms in Good (`[Type]`, `[text](Self::method)`, link-reference definitions) match rustdoc syntax. Note: second source `serde.rs` is an example link target, not a source (drop it). |
| rust-doc-link-types | **rejected** | Near-duplicate of `rust-doc-intra-links` (title+summary Jaccard 0.55; same decision "use intra-doc links"); merge or delete one (CONTRACT §12). |
| rust-doc-module-inner | verified | Both compile; `//!` semantics correct. Note: Good doctest fails (`my_crate::auth` items not defined in snippet). |
| rust-doc-panics-section | verified | Both compile; `# Panics` convention correct. Notes: Good doctest fails (`assert_eq!(v.get(1), &2)` type mismatch); hedge "might" in Why. |
| rust-doc-question-mark | verified | Both compile; `?`-in-doctest mechanism correct. Note: Good doctests fail under `rustdoc --test` (`Config::from_file`/`Client::new` are not defined — the snippet defines free `from_file`); fix the example bindings. |
| rust-doc-safety-section | verified | Both compile; `# Safety` convention correct; unsafe-fn claims sound. |

## Non-blocking notes (for the owner)

- Doctest failures (supplementary `rustdoc --test`): `doc-examples-section`, `doc-hidden-setup`, `doc-module-inner`, `doc-panics-section`, `doc-question-mark`, `test-doctest-examples` Bad. The outer snippets compile and the decisions are sound; the doc examples reference items not defined in the snippet. `test-doctest-examples` Bad's "not caught" annotation is factually wrong (fenced blocks are compiled by rustdoc).
- `lint-deny-correctness` Bad: `for x in repeat(1)` is not caught by any lint (runtime infinite loop only); `x` is undefined before the intended errors.
- `test-cfg-test-module` Bad: `#[test]` functions are cfg(test)-gated; only the module's helpers/imports leak into release builds.
- `test-criterion-bench`: `criterion::black_box` deprecated on criterion 0.8.2 (the task harness pins 0.5.1).
- `async-broadcast-pubsub` Bad: the clone-failure line is commented out, weakening the demonstration.
- `doc-intra-links`: drop the `serde.rs` source entry (example link target, not a source).
- Out of scope: the deterministic validator currently reports 2 catalog errors because `perf-collect-once.md` was deleted while `anti-collect-intermediate` and `api-impl-fromiterator` still list `rust-perf-collect-once` in `related`; `INDEX.md` verified counts are stale; `catalog/rules/rust/categories.md` / `sources.md` do not exist (other languages have them).

## Counts

- Verified: 55/72 (flipped to `status: verified`)
- Rejected: 17 (`async-async-fn-bounds`, `async-clone-before-await`, `async-fn-in-trait`, `proj-feature-additive`, `proj-mod-rs-dir`, `proj-workspace-deps`, `lint-cfg-check`, `lint-unsafe-doc`, `lint-warn-suspicious`, `lint-workspace-lints`, `test-arrange-act-assert`, `test-should-panic`, `test-snapshot-testing`, `test-tokio-async`, `test-use-super`, `doc-crate-readme`, `doc-link-types`) - left `status: draft`
- Blockers: 6 version-number removals; 1 snippet fix (`proj-feature-additive` `extern crate alloc;`); 5 test-snippet self-containment fixes; 2 frontmatter/source fixes (`lint-unsafe-doc` tool id, `lint-warn-suspicious` drop clippy.toml mechanism); 1 upstream-meaning fix (`proj-mod-rs-dir`); 1 duplicate merge (`doc-link-types` vs `doc-intra-links`); 1 Bad rewrite (`async-clone-before-await`). All are mechanical; none is structurally broken.

---

# Addendum - Fix Re-Verification (2026-10-05)

Re-checked all 17 fixes: the 16 previously rejected rules plus `doc-intra-links` (edited for the merge; `doc-link-types` deleted). All 17 flipped to `status: verified`; group 4 is now **71/71 verified** (71 files; `doc-link-types` removed, INDEX parity 262/262, no dangling references anywhere).

Method re-run: upstream re-diff of the touched rules; full extraction and compile of all 142 snippets (71 files) in lib and `--test` modes; version/hedge/fence scan on all 71; See Also/`related`/INDEX resolution; duplicate Jaccard scan; deterministic validator; live clippy probes.

## Fix results

| fix | result | evidence |
|---|---|---|
| six version removals (`async-async-fn-bounds`, `async-fn-in-trait`, `doc-crate-readme`, `lint-cfg-check`, `lint-workspace-lints`, `proj-workspace-deps`) | verified | prose scan of all 71 files: zero version numbers outside code examples; snippets compile; wording is baseline-relative |
| `async-clone-before-await` | verified | comment now conditional and accurate (`&[Item]` is `!Send` iff `Item: !Sync`); both snippets compile. Note: as written `Item` is Sync, so the Bad compiles and does not itself exhibit E0277 |
| `proj-feature-additive` | verified | `extern crate alloc;` added; the no_std path (feature `std` off) compiles in the cargo fixture; E0433 gone |
| `proj-mod-rs-dir` | verified | direction now upstream-faithful: Bad = mixing styles + blind mod.rs for a 2-file module; Good = adjacent for 1-3 submodules, mod.rs for 4+; comment-only fences compile |
| `lint-unsafe-doc` | verified | `enforce: tool` + `tool: clippy::undocumented_unsafe_blocks`; live probe: Bad emits 2 "unsafe block missing a safety comment" warnings, Good 0 |
| `lint-warn-suspicious` | verified | invalid `clippy.toml warn` mechanism removed; `#![warn(clippy::suspicious)]` accepted by clippy 0.1.94 (no unknown lint); snippet compiles |
| five test rules (`test-arrange-act-assert`, `test-should-panic`, `test-snapshot-testing`, `test-tokio-async`, `test-use-super`) | verified | `--test` compile of the whole test prefix is 30/30; the five now define their fixtures (`User`/`UserError`, `divide`, `AppError`/`Config`, `fetch_data`/`fetch_user`, `mod my_module`) |
| `doc-intra-links` (merge) | verified | merged `ParseError` enum + `parse_file` `# Errors`/`# Related` content from `doc-link-types`; compiles; `rustdoc` reports no broken intra-doc links; no duplicate pair >= 0.55 remains |
| `doc-crate-readme` | verified | version removed; Good still compiles in the README fixture crate; `compile_exempt` accurate |

## Compile / validator summary after fixes

- Lib compile: all 142 snippets pass except `doc-crate-readme` Good (passes with the README fixture) and `lint-deny-correctness` Bad (compile-exempt; intentional E0308/E0597 + clippy correctness lints reproduced earlier).
- `--test` compile: 30/30 test-prefix snippets (previously 8 failures across 5 rules).
- Deterministic validator: 0 errors in scope (0 catalog-wide).
- No duplicate pair >= 0.55; links, `related`, INDEX all resolve.

## Residual notes (non-blocking, for the owner)

- `async-fn-in-trait`: Why still says "carries two precise caveats you must understand before migrating" but the body does not state them (upstream Caveats section dropped by the contract body shape). Fold in the dyn-compatibility and `Send` caveats or drop the promise.
- `proj-mod-rs-dir`: title "Use mod.rs for multi-file modules" is broader than the body (adjacent for 1-3 submodules); and the Good bullet "Matches Rust 2018+ default lint preference" is not backed by clippy defaults - `mod_module_files` and `self_named_module_files` are both allow-by-default and point in opposite directions (probe). Consider retitling and rewording that bullet.
- `test-tokio-async`: the commented-out illustration is a hard error, but the comment gives the wrong reason; the actual error is E0728 "async functions cannot be used for tests".
- `doc-intra-links` still lists `serde.rs` (an example link target, not a source).
- The earlier non-blocking notes stand (doctest details, `criterion::black_box` deprecation, `test-cfg-test-module` wording, `async-broadcast-pubsub` commented clone line).

## Final counts

- Group 4: verified 71/71 (all flipped; 1 rule deleted by merge).
- Re-checked set: 17/17 fixed and flipped.
- Pack total: 262 rules.
