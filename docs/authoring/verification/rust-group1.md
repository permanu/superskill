# Verification Report - Rust Pack, Group 1 (`own`, `mem`, `unsafe`, `const`, `conv`, `num`, `anti`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 63 rules - `own-*` (12), `mem-*` (17), `unsafe-*` (7), `const-*` (4), `conv-*` (3), `num-*` (5), `anti-*` (15)
- Upstream: `github.com/leonardomso/rust-skills` @ `fd2a861ab0406a4ac536a55274d14ea6fd1ca9c9` (pinned commit; all 63 upstream rule URLs fetched, HTTP 200)
- Toolchain: rustc/cargo 1.94.0 (4a4ef493e 2026-03-02), edition 2024; validator `node dist/rules/cli.js validate --lang rust` (dist rebuilt from current `src/`; the previously committed dist harness was stale)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode` (upstream clone, diff tooling, cargo fixture probes)

## Method

- Fetched every upstream rule at the pinned commit and line-diffed each Why/Bad/Good section against the adapted body (normalizing the fence-merge adaptation). Drift found is limited to compilable-scaffolding additions (`fn main` wraps, helper types/functions), removal of upstream elisions (`{ ... }` -> `{}`), and three documented repairs: `mem-arrayvec` (`Vec<Option>` -> `Vec<Option<u32>>`, invalid `#[no_std]` on a fn removed), `mem-assert-type-size` (duplicate upstream struct commented out), `mem-drop-order`/`mem-take-replace` explanatory comments. No semantic drift.
- Compile: rebuilt validator harness = `rustc --edition 2024 --crate-type lib --emit metadata` with `fn main` wrap fallback, then a cargo fixture (serde, tokio, thiserror, anyhow, reqwest, smallvec, thin-vec, static_assertions, compact_str, bumpalo, arrayvec, log, toml, lazy_static, ...) on unresolved-crate errors. Result: 0 compile errors across all 63 rules (116 snippets); the cargo fixture path was exercised by the dependency-heavy rules.
- `compile_exempt` (5 rules): validator skip by design; both snippets compiled manually. Every documented intentional error reproduced: `E0277 Rc<Vec<i32>> cannot be sent between threads`, `E0277 RefCell<Vec<i32>> cannot be shared between threads`, `extern blocks must be unsafe`, 3x `unsafe attribute used without unsafe`, `E0015 cannot call non-const function header_len in constants`. All five Good snippets compile cleanly.
- External URLs (4 distinct): ripgrep `pathutil.rs` (200; Cow borrowing - backs `own-borrow-over-clone`, `own-cow-conditional`), rustc `rustc_expand/src/base.rs` (200; uses `SmallVec` - backs `mem-smallvec`), fd `walk.rs` (200; `Vec::with_capacity` - backs `mem-with-capacity`), roc `to_var.rs` (404 - dead).
- Semantic probe: `CompactString` inline capacity measured with a cargo probe against the cached fixture (24-byte strings are inline; see rejection).
- Formatting/duplicates: deterministic validator (0 errors in group) plus manual version-number scan and pack-wide similarity scans.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| rust-anti-clone-excessive | verified | Upstream 200; body matches (scaffolding only); both snippets compile; borrow-instead-of-clone guidance sound. Overlaps `own-borrow-over-clone` (see Duplicates). |
| rust-anti-collect-intermediate | verified | Upstream 200; body matches; compiles; lazy-chain guidance sound. Near-duplicate of `perf-collect-once` (same title; see Duplicates). |
| rust-anti-empty-catch | verified | Upstream 200; compiles incl. `log` via cargo fixture; "never silently discard errors" matches Rust Book error handling. |
| rust-anti-expect-lazy | verified | Upstream 200; cargo fixture (tokio, reqwest, anyhow) compiles; `.expect` for recoverable errors is the canonical panic-vs-Result hazard. |
| rust-anti-format-hot-path | verified | Upstream 200; compiles; buffer-reuse with `write!` is the idiomatic fix. |
| rust-anti-index-over-iter | verified | Upstream 200; compiles; iterator-over-index guidance sound. Minor: Bad/Good share `fold(0.0, f64::max)`, wrong for all-negative input (non-blocking, unrelated to the rule's decision). |
| rust-anti-lock-across-await | verified | Upstream 200; cargo fixture (tokio) compiles; std-mutex-across-await deadlock claim is the documented async hazard. |
| rust-anti-over-abstraction | verified | Upstream 200; compiles; "start concrete, generalize on real use cases" is sound engineering guidance. |
| rust-anti-panic-expected | verified | Upstream 200; cargo fixture (serde, reqwest, thiserror, toml, serde_json) compiles; Result-over-panic for expected failures sound. |
| rust-anti-premature-optimize | verified | Upstream 200; cargo fixture (lazy_static) compiles; profile-first guidance sound. Validator warning: the word "placeholder" in a Good comment (descriptive use; non-blocking). |
| rust-anti-string-for-str | verified | Upstream 200; compiles; `&String` -> `&str` flexibility claim correct. Contained in `own-slice-over-vec` (see Duplicates). |
| rust-anti-stringly-typed | verified | Upstream 200; compiles; enum/newtype safety claim correct. Adapter replaced upstream `{ ... }` elisions with `{}` (anti-slop fix, meaning preserved). |
| rust-anti-type-erasure | verified | Upstream 200; compiles; `impl Trait` vs `Box<dyn>` tradeoff stated correctly, including when `Box<dyn>` is right. |
| rust-anti-unwrap-abuse | verified | Upstream 200; cargo fixture (serde, thiserror, toml) compiles; production-unwrap guidance sound. |
| rust-anti-vec-for-slice | verified | Upstream 200; compiles; decision fully contained in `own-slice-over-vec` (see Duplicates). |
| rust-const-block | **rejected** | Version numbers in rule text: "stabilized in Rust 1.79" (Why) and "legal since 1.79" (Bad comment) - CONTRACT.md §8. Content otherwise sound: compiles; `const {}` guidance current. Fix: strip the version references. |
| rust-const-fn | verified | `compile_exempt`: intentional `E0015` reproduced (`header_len()` non-const used as array length); Good compiles; Why caveat accurate; `const fn` guidance current. |
| rust-const-generics | verified | Upstream 200; compiles; const-generic guidance current and stable. |
| rust-const-vs-static | **rejected** | Version number in rule text: "`LazyLock` (stable since 1.80)" (Good comment) - §8. Content otherwise sound: compiles; const/static semantics and `static mut` edition-2024 note correct. |
| rust-conv-asmut-mutable | verified | Upstream 200; compiles; `impl AsMut<[u8]>` widening idiom correct and correctly scoped ("not every `&mut T`"). |
| rust-conv-fromstr-parsing | verified | Upstream 200; compiles; `FromStr` unlocks `str::parse` - matches std docs. |
| rust-conv-tryfrom-fallible | verified | Upstream 200; compiles; `TryFrom`/`TryInto` blanket relationship matches API Guidelines C-CONV-TRAITS. |
| rust-mem-arena-allocator | **rejected** | Cited external source 404: `github.com/roc-lang/roc/blob/main/crates/compiler/solve/src/to_var.rs` no longer exists (repo restructured; tree API shows no `crates/` and no `to_var.rs`) - §5 "URLs must resolve". Primary upstream URL resolves and snippets compile; fix: update or drop the roc source entry. |
| rust-mem-arrayvec | verified | Upstream 200; cargo fixture (arrayvec, smallvec) compiles; adapter repaired upstream defects (`Vec<Option>` -> `Vec<Option<u32>>`; invalid `#[no_std]` on fn removed). |
| rust-mem-assert-type-size | verified | Upstream 200; cargo fixture (static_assertions) compiles; asserted size 48 correct for `u64 + enum(1) + [u8;32]` with alignment. |
| rust-mem-avoid-format | verified | Upstream 200; cargo fixture (log) compiles; static-text/log-args guidance sound. |
| rust-mem-box-large-variant | verified | Upstream 200; compiles; enum size = largest variant claim correct. |
| rust-mem-boxed-slice | verified | Upstream 200; compiles; `Box<[T]>` two-word layout and intent claim correct. |
| rust-mem-clone-from | verified | Upstream 200; compiles; `clone_from` reuses allocation - matches std docs. |
| rust-mem-compact-string | **rejected** | Factual error in Good comment: "strings <= 23 bytes are inline" - wrong. Probe on `compact_str` (cargo fixture): a 24-byte string is stored inline with correct round-trip (`len=24 inline=true`), and docs state "Inline, a string <= 24 bytes long". Fix: 23 -> 24. |
| rust-mem-drop-order | verified | Upstream 200; compiles; added comments match the Reference destructor order (struct fields in declaration order, locals reverse); Bad/Good field order consistent with the claim. |
| rust-mem-reuse-collections | verified | Upstream 200; compiles; clear-and-reuse guidance sound. Cosmetic: scaffolding names a type `Result` (shadows std; non-blocking). |
| rust-mem-smaller-integers | verified | Upstream 200; compiles; stated sizes correct (Pixel 4 B, HttpStatus 3 B + 1 padding, GeoPoint 8 B). |
| rust-mem-smallvec | verified | Upstream 200; cargo fixture (smallvec) compiles; rustc `rustc_expand/src/base.rs` (200) uses `SmallVec` as cited. |
| rust-mem-take-replace | verified | Upstream 200; compiles; `take`/`replace` semantics and zero-copy claim correct. |
| rust-mem-thinvec | verified | Upstream 200; cargo fixture (thin-vec) compiles; ThinVec single-pointer layout claim correct. |
| rust-mem-with-capacity | verified | Upstream 200; compiles; fd `walk.rs` (200) uses `Vec::with_capacity` as cited. |
| rust-mem-write-over-format | verified | Upstream 200; compiles; `io::Write`/`fmt::Write` distinction correct. |
| rust-mem-zero-copy | verified | Upstream 200; compiles; returned slices borrow the input (lifetime-correct). |
| rust-num-cast-try-from | **rejected** | Version number in Why: "saturate ... since Rust 1.45" - §8. Content otherwise sound: compiles; `300 as u8 == 44` and `TryFrom` behavior verified by the snippet's tests. Fix: drop the version reference. |
| rust-num-float-compare | **rejected** | Version number in Why: "`total_cmp` (stable since Rust 1.62)" - §8. Content otherwise sound: compiles; NaN/total_cmp behavior tests pass. Fix: drop the version reference. |
| rust-num-nonzero | verified | Upstream 200; compiles; `Option<NonZeroU32>` niche (same size as u32) claim correct. |
| rust-num-overflow-explicit | verified | Upstream 200; compiles; debug-panic/release-wrap behavior correct; explicit variants guidance sound. |
| rust-num-saturating-clamp | **rejected** | Version numbers in rule text: "since Rust 1.50" (Why) and "available on f32/f64 since Rust 1.50" (Good comment) - §8. Content otherwise sound: compiles; float NaN clamp behavior asserted. |
| rust-own-arc-shared | verified | `compile_exempt`: intentional `E0277` reproduced (`Rc<Vec<i32>> cannot be sent between threads`); Good compiles; Arc rationale correct. |
| rust-own-borrow-over-clone | verified | Upstream 200; compiles; ripgrep `pathutil.rs` (200) uses `Cow` as cited. Overlaps `anti-clone-excessive` (see Duplicates). |
| rust-own-clone-explicit | verified | Upstream 200; compiles; Clone-vs-Copy guidance matches std docs. |
| rust-own-copy-small | verified | Upstream 200; compiles; small-Copy guidance conventional and sound. |
| rust-own-cow-conditional | verified | Upstream 200; compiles; ripgrep source backs the Cow pattern. |
| rust-own-lifetime-elision | verified | Upstream 200; compiles; elision rules per the Reference; explicit lifetime kept where required. |
| rust-own-move-large | verified | Upstream 200; compiles; move-cost/boxing rationale correct. |
| rust-own-mutex-interior | verified | `compile_exempt`: intentional `E0277` reproduced (`RefCell<Vec<i32>> cannot be shared between threads`); Good compiles. |
| rust-own-rc-single-thread | verified | Upstream 200; compiles; Rc-vs-Arc overhead rationale correct. |
| rust-own-refcell-interior | verified | Upstream 200; compiles; runtime borrow-checking rationale correct. |
| rust-own-rwlock-readers | verified | Upstream 200; compiles; multi-reader/one-writer claim correct. |
| rust-own-slice-over-vec | verified | Upstream 200; compiles; canonical hub rule; deref coercions in Good are correct. Contains `anti-vec-for-slice` / `anti-string-for-str` (see Duplicates). |
| rust-unsafe-extern-block | verified | `compile_exempt`: intentional error reproduced (`extern blocks must be unsafe` on edition 2024); Good (`unsafe extern` + `safe fn`) compiles; edition-guide change accurate. |
| rust-unsafe-maybeuninit | **rejected** | Version numbers in rule text: "deprecated in Rust 1.39" (Why), "stable since Rust 1.95" (Good comment) - §8. Additionally the Good uses a `transmute` workaround although `MaybeUninit::<[T; N]>::from` is stable on the baseline (confirmed 1.95 release notes); on latest the direct `From` form is the idiomatic one. Fix both, then re-verify. |
| rust-unsafe-minimize-scope | verified | Upstream 200; Bad compiles with the edition-2024 `unsafe_op_in_unsafe_fn` warning; Good compiles. Note: "2024 edition requires `unsafe {}`" is loose - the lint warns by default (edition guide); guidance itself unaffected. |
| rust-unsafe-miri-ci | verified | Upstream 200; comments-only snippets compile; Miri capability list accurate. Rendering: CI YAML embedded as Rust comments (known pack-wide debt). |
| rust-unsafe-no-mangle-unsafe | verified | `compile_exempt`: intentional errors reproduced (3x `unsafe attribute used without unsafe` on edition 2024); Good compiles. |
| rust-unsafe-safety-comment | verified | Upstream 200; compiles; `clippy::undocumented_unsafe_blocks` is a real (restriction, allow-by-default) lint and matches `enforce: tool`. |
| rust-unsafe-send-sync-manual | verified | Upstream 200; compiles; PhantomData opt-out and documented unsafe-impl guidance correct. |

## Cross-cutting checks

- Compile: 63/63 rules compile (116/116 snippets); 5 `compile_exempt` rules manually verified (intentional errors real, Goods clean). Validator: 0 errors in group; the only 4 pack errors are outside this group (`macro-export-crate-path`, `obs-library-facade`, `proj-feature-additive`, `test-snapshot-testing`).
- Formatting: 0 errors in group; warnings only (non-blocking per §12): 52x `snippet-too-long` (max 66 lines in `anti-panic-expected` Good; scaffolding inflated upstream fragments), 11x `comment-elision`, 8x hedging, 1x forbidden-token (`anti-premature-optimize`, descriptive "placeholder"). All 63 have `baseline: latest`; ids match paths; `related`/See Also links resolve; one `rust` fence per Bad/Good.
- Links: 63/63 upstream URLs 200; 3/4 external URLs 200; 1 dead (roc, see `mem-arena-allocator` rejection).
- Duplicates (documented, not blocking, per prior-verifier practice; owner consolidates): within group - `own-slice-over-vec` fully contains `anti-vec-for-slice` (same `sum(&Vec<i32>)` example) and `anti-string-for-str` (same `greet(&String)` example); `own-borrow-over-clone` ~ `anti-clone-excessive` (Why similarity 0.50); `mem-avoid-format` ~ `anti-format-hot-path` (0.54) ~ `mem-write-over-format`. Across pack (token Jaccard): `anti-index-over-iter` <-> `perf-iter-over-index` (0.64), `anti-collect-intermediate` <-> `perf-collect-once` (0.56, identical title), `anti-lock-across-await` <-> `async-no-lock-await` (0.49), `anti-panic-expected` <-> `err-result-over-panic` (0.46), `anti-stringly-typed` <-> `type-no-stringly` (0.41), `anti-expect-lazy` <-> `err-expect-bugs-only` (0.41), `anti-unwrap-abuse` <-> `err-no-unwrap-prod` (0.38). Top consolidation candidates: `anti-collect-intermediate`/`perf-collect-once` and `anti-index-over-iter`/`perf-iter-over-index` (duplicate decisions, same titles).
- Version-number debt is pack-wide: 12 rust files contain version references; 6 are in this group and were rejected (`const-block`, `const-vs-static`, `num-cast-try-from`, `num-float-compare`, `num-saturating-clamp`, `unsafe-maybeuninit`); the others are `async-fn-in-trait` (in its title), `async-async-fn-bounds`, `conc-scoped-threads`, `doc-crate-readme`, `lint-cfg-check`, and the INDEX entry. The owner should sweep consistently.

## Follow-ups (outside verifier ownership)

- Rejected rules and required fixes: strip version references (`const-block` 1.79 x2; `const-vs-static` 1.80; `num-cast-try-from` 1.45; `num-float-compare` 1.62; `num-saturating-clamp` 1.50 x2; `unsafe-maybeuninit` 1.39/1.95 + prefer the stable `From` conversion over `transmute`); update/drop the dead roc source (`mem-arena-allocator`); fix "23" -> "24" (`mem-compact-string`). All eight are content-sound and one-edit fixes.
- `dist/` harness was stale: the shipped `dist/rules/harness/rust.js` lacks the cargo fallback and reports spurious compile failures for external-crate rules (122 pack errors pre-rebuild vs 4 post-rebuild). `npm run build` before running the validator (dist is gitignored).
- `INDEX.md` still says `Rules: 265 (verified: 0)` and lists all rules as drafts; owner updates counts after this batch (55 verified in group).
- Minor non-blocking notes: `unsafe-minimize-scope` "requires" vs warns (edition guide); `anti-index-over-iter` `fold(0.0)` edge; `mem-reuse-collections` scaffolding type named `Result`; `unsafe-miri-ci` YAML-as-comments rendering.

## Counts

- Verified: 55/63 (flipped to `status: verified`)
- Rejected: 8 (`rust-const-block`, `rust-const-vs-static`, `rust-mem-arena-allocator`, `rust-mem-compact-string`, `rust-num-cast-try-from`, `rust-num-float-compare`, `rust-num-saturating-clamp`, `rust-unsafe-maybeuninit`) - all left `draft`
- Blockers: none for the verified set; the 8 rejections are one-edit fixes (6 version-reference strips, 1 dead link, 1 wrong number)

---

# Addendum (2026-10-05) - Re-verification of the 8 rejected rules + reference cleanup

- Re-check toolchains: rustc/cargo 1.95.0 (59807616e 2026-04-14) for the latest-stable compile checks (installed locally); default 1.94.0 for comparison. Validator run with the 1.95 toolchain first on PATH: `PATH=~/.rustup/toolchains/1.95.0-aarch64-apple-darwin/bin:$PATH node dist/rules/cli.js validate --lang rust --json`.

## Re-check evidence

| rule id | previous | re-check evidence | verdict |
|---|---|---|---|
| rust-const-block | rejected (1.79 x2) | Version references removed; "A `const { }` block forces the enclosed expression to be evaluated at compile time" is accurate and version-free; group-wide scan for 1.39/1.45/1.50/1.62/1.79/1.80/1.95 finds no matches; snippets compile. | verified (flipped) |
| rust-const-vs-static | rejected (1.80) | "`LazyLock`" comment is now version-free; const/static semantics unchanged; compiles. | verified (flipped) |
| rust-num-cast-try-from | rejected (1.45) | Why now "values outside range saturate to the type's min/max, but `NaN` becomes `0`" - accurate and version-free; snippet tests pass. | verified (flipped) |
| rust-num-float-compare | rejected (1.62) | Why now "`f64::total_cmp` for total ordering" - accurate and version-free; behavior tests pass. | verified (flipped) |
| rust-num-saturating-clamp | rejected (1.50 x2) | Why now "f32/f64 via their own `clamp`" - accurate and version-free; NaN clamp assertion passes. | verified (flipped) |
| rust-unsafe-maybeuninit | rejected (1.39/1.95 + transmute) | Version references removed; Good restored to the direct `MaybeUninit::<[u8; 1024]>::from(buf).assume_init()`. Direct compiles: Good rc=0 on rustc 1.95.0, rc=1 (E0308) on 1.94.0 because `From<[MaybeUninit<T>; N]>` stabilized in 1.95 (release notes); Bad rc=0 on both. Under the 1.95 validator the rule compiles normally (not compile-exempt). | verified (flipped) |
| rust-mem-arena-allocator | rejected (roc 404) | Dead roc URL replaced with `https://docs.rs/bumpalo/latest/bumpalo/` (HTTP 200; "A fast bump allocation arena"; "to deallocate all the objects in the arena at once ... mass deallocation extremely fast"; `Bump` implements `Drop`). No roc references remain in the group. | verified (flipped) |
| rust-mem-compact-string | rejected (23 vs 24) | Good now says "strings ≤ 24 bytes are inline"; probe: 23- and 24-byte strings inline with correct round-trip, 25-byte heap (docs: "a string <= 24 bytes long"). | verified (flipped) |
| rust-anti-collect-intermediate | verified (re-check) | `perf-collect-once` was deleted pack-wide (265 -> 263 rules; also `name-iter-method`); all references to both removed from `related` and See Also (pack-wide grep: 0 hits); remaining targets resolve; code unchanged and compiles. | verified (unchanged) |

## Validator (rustc 1.95.0)

- Group: 0 errors across all 63 rules; `unsafe-maybeuninit` compiled normally (no compile-exempt skip).
- Pack: 1 error, outside this group (`test-snapshot-testing`, unresolved import in the cargo fixture).
- Recorded caveat: under the default local 1.94 toolchain, `unsafe-maybeuninit` Good fails with E0308 because the `From` conversion is 1.95+. Flipped on the latest-stable evidence (rustc 1.95.0) per CONTRACT.md §8; CI uses the latest stable toolchains.

## Final counts

- Group 1: 63/63 verified (own 12, mem 17, unsafe 7, const 4, conv 3, num 5, anti 15); 0 rejected; 0 blockers.
- All previous rejections resolved; no re-rejections.
