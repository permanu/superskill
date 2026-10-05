# Verification Report — Rust Group 3 (`macro`, `closure`, `coll`, `opt`, `perf`, `conc`, `obs`, `name`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/rust/<prefix>-*.md` for the 8 prefixes above = 69 rules; all entered as `status: draft`
- Toolchain: `rustc 1.94.0 (4a4ef493e 2026-03-02)`, `cargo 1.94.0`, `--edition 2024`, macOS
- Compile fixtures: warmed cargo project with serde, serde_json, tokio, thiserror, anyhow, indexmap, rayon, criterion, proptest, once_cell, rand, futures, bytes, tracing, tracing-subscriber, env_logger, syn, quote, proc-macro2, rustc-hash, ahash, smallvec, … plus a `proc-macro = true` fixture for the `macro-proc-*` rules (per-snippet unique package names; shared target dir)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode`
- Ownership: flipped `status` to `verified` on 57 rules; 12 left `draft`. No other edits; no git.

## Method

1. Fetched all 69 cited upstream files (`github.com/leonardomso/rust-skills/blob/master/rules/<file>` → HTTP 200; raw content downloaded) and diffed each adaptation's Why/Bad/Good against upstream. The adaptation is upstream-faithful for 64/69 (Why verbatim; Bad/Good expanded from upstream elisions `{ ... }` into compilable code, multiple upstream fences merged into one). The 5 Why deltas are added compile-exempt disclosure notes; 3 rules needed semantic scrutiny (below).
2. Extracted all 138 Bad/Good snippets and compiled them: `rustc --edition 2024 --crate-type lib --emit metadata`, wrapping statement fragments in `fn main()`, falling back on unresolved-crate errors to the cargo fixtures above. 130/138 compiled; the 8 failures are itemized below.
3. Checked the 2 external (non-upstream) source URLs: Cargo profiles reference (supports `codegen-units`, `lto = "fat"`, `strip`, `panic`, `[profile.release.package."*"]` claims) and ripgrep `standard.rs` (HTTP 200; contains `#[inline(always)]`).
4. Ran the deterministic validator (`node dist/rules/cli.js validate --lang rust --no-compile`): 0 errors for the group; warnings only (snippet length, comment elisions, hedging, one Unicode ellipsis in prose, one "Placeholder" comment word) — all non-blocking per CONTRACT §12. Checked `baseline: latest`, ids/paths, `related` resolution, See Also targets, INDEX parity, and duplicate similarity (whole-doc and title+summary Jaccard).
5. Adjudicated idiom/title/body/frontmatter against the contract (incl. §3/§8/§12: tool ids for enforcement claims, no version numbers, preview features never the default).

Note for the owner: `dist/rules/harness/rust.js` is stale relative to `src/rules/harness/rust.ts` (no cargo fallback), so `validate` with compile enabled misreports unresolved-crate snippets. This verification used the src-equivalent logic in scratch. Rebuild `dist` before CI compile checks.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| rust-macro-export-crate-path | **rejected** | Bad fails to compile — cargo fixture: `error[E0463]: can't find crate for 'mylib'`; no `compile_exempt`. Good also drifted from upstream (dropped the `pub use greet;` re-export the rule is about, replaced by a comment). |
| rust-macro-fragment-specifiers | verified | Bad reproduces the documented error (`error: expected expression, found 'let' statement`); Good compiles; compile-exempt approved. Why upstream + disclosure note. |
| rust-macro-prefer-functions | verified | Both compile; upstream Why/Good verbatim; no dup/format issue. Note: Good `fn double(x) { x * x }` squares rather than doubles — example naming nit (upstream), not a rule defect. |
| rust-macro-private-helpers | verified | Both compile (rustc); upstream-faithful; no dup/format issue. |
| rust-macro-proc-error-spans | verified | Both compile in the proc-macro fixture; adaptation fixed upstream's non-compiling `parse_macro_input!`-inside-`Result` Good (`syn::parse::<DeriveInput>(input)?`); `Error::new_spanned` usage sound. |
| rust-macro-proc-syn-quote | verified | Both compile (proc-macro fixture); Cargo.toml content kept as comments per contract shape; upstream-faithful. |
| rust-macro-proc-two-crate | verified | Bad reproduces documented error (`proc-macro crate types currently cannot export any items other than functions tagged …`); Good is a consumer-side fragment (unresolved `mycrate`, exempt-approved) — semantics sound. Recommend a self-contained rendering when next edited. |
| rust-macro-rules-hygiene | verified | Good compiles; Bad standalone fails E0432 (`mylib`), but the documented cross-crate `crate::`-resolves-in-caller error is real; exempt approved. Why upstream + disclosure note. |
| rust-closure-disjoint-capture | verified | Both compile; upstream-faithful (edition-2021 disjoint captures current on 2024); no dup. |
| rust-closure-fn-trait-bounds | verified | Both compile; `FnOnce ⊇ FnMut ⊇ Fn` guidance correct; no dup. |
| rust-closure-impl-fn-return | verified | Both compile; `impl Fn` vs `Box<dyn Fn>` trade-off current; no dup. |
| rust-closure-move-capture | verified | Both compile; `move` + clone-before-move guidance current; no dup. |
| rust-closure-static-vs-dyn | verified | Both compile; static/dynamic dispatch trade-off sound. Minor: Unicode `…` in Why prose (non-blocking warning). |
| rust-coll-binaryheap | verified | Both compile; `BinaryHeap`/`Reverse` claims correct (O(log n) push/pop, min-heap via Reverse). |
| rust-coll-map-choice | verified | Both compile (Good via cargo/indexmap); HashMap/BTreeMap/IndexMap guidance current. |
| rust-coll-seq-choice | verified | Both compile; `Vec`/`VecDeque`/`LinkedList` guidance current; prose note folded into the fence as a comment. |
| rust-coll-set-membership | verified | Both compile; `HashSet`/`BTreeSet` complexity claims correct. |
| rust-conc-atomic-ordering | verified | Both compile; Relaxed/Acquire/Release/SeqCst guidance and `static_mut` Bad are correct on edition 2024; severity `must` appropriate. |
| rust-conc-rayon-par-iter | verified | Both compile (Good via cargo/rayon); `par_iter`/`reduce`/`par_sort_unstable_by` sound; hedging "often" is a non-blocking warning. |
| rust-conc-scoped-threads | **rejected** | Why contains a version number: "stable since Rust 1.63" (CONTRACT §8 "Do not write version numbers anywhere in rules"; same class as cpp-batch2 rejection). Everything else passes (both snippets compile). Drop the parenthetical and re-verify. |
| rust-conc-thread-local | verified | Bad reproduces the documented `static_mut_refs` hard error ("creating a mutable reference to mutable static"); Good compiles (`thread_local!` + `RefCell`/`Cell`); exempt approved; severity `must` appropriate. |
| rust-obs-error-chain | verified | Both compile (cargo/tracing/anyhow); `{:#}` full-chain claim and log-once guidance correct. |
| rust-obs-instrument-spans | verified | Both compile; `#[instrument(skip(..))]` and `.instrument()` guidance correct. Non-blocking warning: the word "Placeholder" in a Good comment. |
| rust-obs-levels-filter | verified | Both compile; `EnvFilter`/`RUST_LOG` claims and level guidance correct. |
| rust-obs-library-facade | **rejected** | Good fails to compile — cargo fixture: `error[E0433]: failed to resolve: use of unresolved module or unlinked crate 'mylib'` (library+binary merged snippet calls `mylib::connect`); no `compile_exempt`. Bad compiles. Make the Good self-contained (or cover it with an exemption). |
| rust-obs-no-sensitive-data | verified | Both compile; skip/redaction guidance correct; severity `must` appropriate. |
| rust-obs-structured-fields | verified | Both compile; `%`/`?`/typed-field sigils correct. |
| rust-obs-tracing-over-log | verified | Both compile; tracing-vs-log claims correct. |
| rust-opt-bounds-check | verified | Both compile; iterator/windows/chunks_exact guidance current. Minor: Good's windows loop is demonstrative only (upstream shape). |
| rust-opt-cache-friendly | verified | Both compile; AoS→SoA and cache-miss cost claims sound. |
| rust-opt-codegen-units | verified | Both compile (comment-only fences); Cargo profiles doc confirms `codegen-units` default 16 (non-incremental) and its trade-off. |
| rust-opt-cold-unlikely | verified | Both compile; `#[cold]` semantics correct. |
| rust-opt-inline-always-rare | verified | Both compile; `#[inline(always)]` sparingly guidance and `Hasher::write` example sound. |
| rust-opt-inline-never-cold | verified | Both compile; `#[cold]` + `#[inline(never)]` error-path extraction correct. |
| rust-opt-inline-small | verified | Both compile; external ripgrep source fetched (200, uses `#[inline(always)]` in hot paths) supports the hinting claim. |
| rust-opt-likely-hint | **rejected** | Version number in rule text: `// Requires nightly; still unstable as of Rust 1.96` (CONTRACT §8). Bad also references undefined `Data`/`handle_corruption`/`fast_cached_path`/`slow_uncached_path` beyond the documented E0554 (nightly unavailable on stable — reproduced). Drop the version comment and complete the snippet, then re-verify. |
| rust-opt-lto-release | verified | Both compile; Cargo profiles doc confirms `lto = "fat"`, `codegen-units = 1`, `panic = "abort"`, `strip = true`. |
| rust-opt-pgo-profile | verified | Both compile; PGO steps (`-Cprofile-generate`/`-Cprofile-use`, `llvm-profdata merge`) current. Bad is adaptation-authored (disclosed) and weak as an anti-pattern — note for the owner. |
| rust-opt-simd-portable | **rejected** | Title/summary endorses nightly-only portable SIMD ("Use portable SIMD …") while the Good demonstrates stable autovectorization (§8: preview features are never the default; title/body mismatch). Also upstream's "Platform-Specific (When Needed)" option was recast as the Bad. Retitle stable-first and re-verify. |
| rust-opt-target-cpu | verified | Both compile; `target-cpu=native`/specific-CPU guidance and x86-64 baseline claim correct. |
| rust-perf-ahash | verified | Both compile (cargo/ahash + rustc-hash 2); hasher trade-off and DoS warning correct. |
| rust-perf-black-box-bench | verified | Both compile with criterion 0.5.1 (no deprecation warnings); `black_box` dead-code/constant-folding claims correct. |
| rust-perf-chain-avoid | verified | Both compile; `chain()` per-element branch claim and pre-combine Good sound. |
| rust-perf-collect-into | **rejected** | Title/summary endorse nightly-only `collect_into` while the Good demonstrates stable `extend` (§8; title/body mismatch). Caveat note is present in Why, but the injected summary still recommends the preview API. Retitle ("Reuse buffers with extend") and re-verify. |
| rust-perf-collect-once | **rejected** | Exact duplicate of `rust-anti-collect-intermediate` (identical title and summary; title+summary Jaccard 1.000; same decision and example shape). Merge or delete one — if the `anti-` rule is deleted instead, this one can be flipped. |
| rust-perf-drain-reuse | verified | Both compile; `drain` capacity-reuse guidance correct. |
| rust-perf-entry-api | verified | Both compile; entry-API single-lookup claims correct. |
| rust-perf-extend-batch | verified | Both compile; `extend` batching claims correct. |
| rust-perf-io-buffering | verified | Both compile; `BufReader`/`BufWriter` syscall claims and explicit-flush guidance correct. |
| rust-perf-iter-lazy | verified | Both compile; laziness/short-circuit claims correct. |
| rust-perf-iter-over-index | verified | Both compile; bounds-check/SIMD claims correct. Cross-pack overlap with `rust-anti-index-over-iter` (distinct framing; title+summary Jaccard 0.22) — keep both, flagged for the owner. |
| rust-perf-profile-first | verified | Both compile (Good via cargo/rayon); profile-first guidance sound. |
| rust-perf-release-profile | verified | Both compile; profile settings match the Cargo profiles reference. |
| rust-name-acronym-word | verified | Both compile; acronym-as-word convention matches std practice. |
| rust-name-as-free | verified | Both compile; `as_`/`to_`/`into_` cost semantics correct. |
| rust-name-consts-screaming | **rejected** | Why claims "enforced by the compiler" but `enforce: review` — CONTRACT §3/§12 require `enforce: tool` + tool id when compiler enforcement is claimed. Evidence: rustc emits `#[warn(non_upper_case_globals)]` for the Bad consts/statics. Set `tool: rustc::non_upper_case_globals` or drop the claim. |
| rust-name-crate-no-rs | verified | Both compile (comment-only fences); crates.io convention current. |
| rust-name-funcs-snake | **rejected** | Same enforcement mismatch: "enforced by the compiler" vs `enforce: review`; rustc emits `#[warn(non_snake_case)]` for the Bad functions. Set `tool: rustc::non_snake_case` or drop the claim. |
| rust-name-into-ownership | verified | Both compile; `into_` ownership-transfer semantics correct. |
| rust-name-is-has-bool | verified | Both compile; boolean prefix guidance correct. |
| rust-name-iter-convention | verified | Both compile; iter/iter_mut/into_iter + IntoIterator-for-references guidance correct. |
| rust-name-iter-method | **rejected** | Near-duplicate of `rust-name-iter-convention` (title+summary Jaccard 0.50; same decision, same IntoIterator Good). Merge or delete one; keep `name-iter-convention` (richer Bad). |
| rust-name-iter-type-match | verified | Both compile; iterator-type naming (`Iter`/`IterMut`/`IntoIter`) matches std practice; distinct decision from the method-naming pair. |
| rust-name-lifetime-short | verified | Both compile; lifetime naming guidance matches API guidelines. |
| rust-name-no-get-prefix | verified | Both compile; getter-naming guidance correct. |
| rust-name-to-expensive | verified | Both compile; `to_` allocation-signal guidance correct. |
| rust-name-type-param-single | verified | Both compile; `T`/`E`/`K`/`V` convention correct. |
| rust-name-types-camel | **rejected** | Enforcement mismatch: "enforced by the compiler and linter" vs `enforce: review`; rustc emits `#[warn(non_camel_case_types)]` for the Bad types/traits. Set `tool: rustc::non_camel_case_types` or drop the claim. |
| rust-name-variants-camel | **rejected** | Enforcement mismatch: "The compiler warns on violations" vs `enforce: review`; rustc emits `#[warn(non_camel_case_types)]` for the Bad variant. Set `tool: rustc::non_camel_case_types` or drop the claim. |

## Cross-cutting findings

- Sources: 69/69 upstream URLs HTTP 200; both external URLs fetched and supporting. No invented URLs.
- Compile: 130/138 snippets OK. 8 failures: 5 are documented compile-exempt Bad demonstrations, all reproduced (conc-thread-local `static_mut_refs`; macro-fragment-specifiers `expected expression, found 'let' statement`; macro-proc-two-crate proc-macro export restriction; macro-rules-hygiene cross-crate `$crate` scenario; opt-likely-hint E0554). 2 are genuine failures on non-exempt rules (macro-export-crate-path Bad; obs-library-facade Good). 1 is an exempt-rule Good fragment (macro-proc-two-crate Good).
- Adaptation fidelity: 64/69 upstream-faithful; deltas are compilability expansions and disclosure notes, except macro-export-crate-path (re-export dropped), opt-simd-portable (upstream "when needed" recast as Bad), and the nightly-title issues in perf-collect-into.
- Duplicates: within the group, `name-iter-convention` / `name-iter-method` (reject the latter). Cross-pack exact duplicate: `perf-collect-once` / `anti-collect-intermediate` (reject the former pending merge). Lower-similarity overlaps flagged, not blocking: `perf-iter-over-index`/`anti-index-over-iter`, `perf-iter-lazy`/`anti-collect-intermediate`, `opt-codegen-units`/`opt-lto-release`, `opt-lto-release`/`perf-release-profile`, `mem-reuse-collections`/`perf-drain-reuse`.
- Formatting: validator 0 errors; remaining warnings are non-blocking (§12). No version numbers except the two rejections above. `baseline: latest` on all 69; ids, `related`, See Also and INDEX parity all clean.

## Follow-ups (outside verifier ownership)

- `INDEX.md` verified counts are stale after this batch's 57 flips; owner should regenerate.
- Rebuild `dist/` so the compile validator uses the cargo fallback present in `src/rules/harness/rust.ts`.
- 12 rejected rules need fixes as itemized; the 2 nightly-first rules (`opt-simd-portable`, `perf-collect-into`) need stable-first titles, and `perf-collect-once`/`anti-collect-intermediate` need a merge decision.

## Counts

- Verified: 57/69 (flipped)
- Rejected: 12 (`macro-export-crate-path`, `conc-scoped-threads`, `obs-library-facade`, `opt-likely-hint`, `opt-simd-portable`, `perf-collect-into`, `perf-collect-once`, `name-consts-screaming`, `name-funcs-snake`, `name-iter-method`, `name-types-camel`, `name-variants-camel`)
- Blockers: none for the verified set; the 12 fixes are mechanical (frontmatter tool ids, version-number removal, snippet self-containment, retitles, one merge).

## Addendum 2026-10-05 — re-check of the 12 rejected rules + merge targets

The owner applied fixes to the 12 rejected rules; all were re-checked with the same method and toolchain (rustc 1.94.0, edition 2024, cargo fixtures). Result: **10 fixed rules flipped to `verified`; 2 resolved by deletion**. `name-iter-convention` was re-verified after the merge (it had been re-drafted) and flipped; `anti-collect-intermediate` (merge target, `anti` prefix, outside this group) was re-checked and is clean.

Per-rule re-check evidence:

| rule id | re-verdict | evidence |
|---|---|---|
| rust-macro-export-crate-path | verified | `compile_exempt` now states the real reason ("Bad demonstrates legacy `#[macro_use] extern crate mylib` and needs a separate consumer crate"); Bad reproduces E0463, Good compiles (rustc). Note: the Good's "Re-export …" comment still has no re-export line (cosmetic; upstream had `pub use greet;`). |
| rust-conc-scoped-threads | verified | Version number removed; both snippets compile. |
| rust-obs-library-facade | verified | Good made self-contained (`mod mylib` + binary main); both compile (cargo/tracing-subscriber/env_logger). |
| rust-opt-likely-hint | verified | Version number removed; Bad now complete and fails with exactly one error, `error[E0554]: #![feature] may not be used on the stable release channel`; `compile_exempt` reason sharpened to the nightly-only API; Good compiles. |
| rust-opt-simd-portable | verified | Retitled stable-first ("Prefer autovectorization on stable; portable SIMD remains nightly-only"); both snippets compile. Minor: Bad is upstream's "Platform-Specific (When Needed)" section recast as anti-pattern — acceptable for the stable-first title. |
| rust-perf-collect-into | verified | Retitled stable-first ("Reuse existing buffers with `extend`; `collect_into` is nightly-only"); both snippets compile. |
| rust-name-consts-screaming | verified | `enforce: tool` + `tool: rustc::non_upper_case_globals` — matches the reproduced `non_upper_case_globals` warnings for the Bad consts/statics. |
| rust-name-funcs-snake | verified | `enforce: tool` + `tool: rustc::non_snake_case` — matches reproduced warnings. |
| rust-name-types-camel | verified | `enforce: tool` + `tool: rustc::non_camel_case_types` — matches reproduced warnings. |
| rust-name-variants-camel | verified | `enforce: tool` + `tool: rustc::non_camel_case_types` — matches reproduced warnings. |
| rust-name-iter-method | deleted | Duplicate resolved: deleted; unique content (`to_iter` Bad case, `api-common-traits` See Also) merged into `rust-name-iter-convention`. No dangling references remain. |
| rust-perf-collect-once | deleted | Duplicate resolved: deleted; `rust-anti-collect-intermediate` kept. No dangling references remain (its owner cleaned the last refs during this pass). |
| rust-name-iter-convention (merge target) | verified | Merged content compiles (Bad incl. `to_iter`, Good); no duplicate remains; links resolve; re-flipped. |
| rust-anti-collect-intermediate (merge target, out of group) | verified (owner) | Both snippets compile (rustc); after its owner's cleanup its `related` and See Also no longer reference the deleted rule; validator-clean. |

Cross-cutting after the re-check:

- Compile: 24/24 snippets in the re-check set behave as intended (opt-likely-hint Bad = E0554 only; macro-export-crate-path Bad = exempt E0463; all other Bad/Good compile).
- Validator: `node dist/rules/cli.js validate --lang rust --no-compile` → **0 errors**, 318 warnings (same non-blocking classes as the first pass).
- Version numbers: none remain in the group.
- Deletions/INDEX: `INDEX.md` updated to 263 rules; directory parity clean. The INDEX `verified:` count still reads 0 and is stale (regeneration outside verifier ownership).

Final counts (group scope, 69 originally):

- Verified: **67/67** remaining rules (57 first pass + 10 re-check flips; `name-iter-convention` re-flipped after merge)
- Rejected: **0**
- Removed: **2** (`rust-perf-collect-once`, `rust-name-iter-method`)
- Blockers: none. Remaining follow-ups: regenerate INDEX verified counts; rebuild `dist/` for the cargo-fallback harness.
