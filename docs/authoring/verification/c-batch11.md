# Verification Report - C Batch 11 (`api` + `const` + `net` + `perf` + `test` + `type`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 23 files, all entered as `status: draft` - `api-*` (4), `const-*` (3), `net-*` (2), `perf-*` (4), `test-*` (4), `type-*` (6)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; Xcode LLVM 21 `llvm-profdata`/`llvm-cov`; deterministic validator `node dist/rules/cli.js validate --lang c --json` (compile enabled)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/c-batch11` (fetched pages, extracted snippets, probes, harnesses)

## Method

1. Fetched all 22 distinct cited URLs (CERT API00-C/MEM00-C/ERR00-C; cppreference const, string literals, restrict, rand, qsort, setvbuf, `_Alignof`, array, integer, arithmetic types, generic, `_Alignas`; man7 tcp(7), shutdown(2), read(2); GCC Optimize Options; Clang UsersManual PGO, TSan, SourceBasedCodeCoverage), converted to text, and grepped every claim against the page text. Cross-checked the dead API00-C path against sibling API pages, the site's own payload index, and the Wayback Machine.
2. Extracted all 46 fenced snippets and compiled each with `clang -fsyntax-only -std=c23 -Wall`: 46/46 exit 0 with zero diagnostics. No rule uses `compile_exempt`.
3. Built and ran harnesses for every checkable behavior: callee validation / commit-rollback / destroy under ASan+UBSan; const compile probes and a literal-write crash; TCP loopback framing and half-close/reset scenarios; `-O2` assembly + vectorization remarks; an end-to-end PGO cycle; a 12.7 MB read-per-byte vs `fgetc` timing comparison; `srand` reproducibility; `qsort` tie-break flakiness; a real TSan race; `llvm-cov` branch output; cross-target `_Static_assert` alignment/width probes; `_BitInt`, `_Generic`, `alignas` runtime checks; the `[static N]` diagnostic.
4. Independently re-checked frontmatter, section order, one `c` fence per Bad/Good, summary word counts, snippet line caps, banned tokens, `related`/See Also/INDEX links, and near-duplicates (Jaccard over all 265 summaries/titles plus manual reads of the closest siblings).
5. Ran the deterministic validator with compilation enabled: 265/265 checked, 0 errors, 8 warnings - none in this batch.
6. Flip policy: only rules passing every check were flipped to `status: verified`; the three rejects were left `draft`.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 46/46 snippets exit 0 with no diagnostics.

## Source evidence (claim-specific)

- **CERT API00-C** (canonical URL `.../recommendations/application-programming-interfaces-api/api00-c/`, HTTP 200): "For safety and security reasons, this standard recommends that the called function validate its parameters. Validity checks allow the function to survive at least some forms of improper usage"; "Requiring the callee to validate arguments allows the validation code to be encapsulated in one location, reducing the size of the code and making it more likely that these checks are performed in a consistent and correct fashion"; "implementing commit or rollback semantics (leaving program state unchanged on error) is a desirable practice for error safety". Its compliant solution is `if (file && !ferror(file) && !feof(file)) { myFile = file; return 0; }` - semantically the Good of both API rules. **The cited `/rules/...` URL is dead (404)** - see reject detail.
- **CERT ERR00-C**: "Components and routines should always generate status indicators, and all called routines should have their error returns checked"; "Consistency in fault handling should be the same with respect to critically similar parts" - verbatim support for `api-error-policy`.
- **CERT MEM00-C**: "memory should be allocated and freed at the same level of abstraction and, ideally, in the same code module"; the MIT Kerberos double-free example - supports `api-destroy-function`.
- **cppreference const** (`const-pointer-fixed`, `const-local-readonly`): "Objects declared with const-qualified types may be placed in read-only memory"; "Any attempt to modify an object whose type is const-qualified results in undefined behavior"; examples include `void f(double * const x, const double * const y);` and `char * const *pcp` plus the not-assignable rules for const-qualified lvalues. The exact `int *const cp` names in the Why are not on the page, but both placements and their assignability rules are; semantics confirmed by compile probes.
- **cppreference string literals**: "each literal initializes an unnamed array with static storage duration"; "String literals are not modifiable (and in fact may be placed in read-only memory such as .rodata). If a program attempts to modify the static array formed by a string literal, the behavior is undefined."
- **man7 tcp(7)**: "TCP does not preserve record boundaries." - verbatim support for `net-message-framing`.
- **man7 shutdown(2)**: "If how is SHUT_WR, further transmissions will be disallowed." The page says nothing about close's discard/reset behavior (that clause of the Why was demonstrated empirically instead; see harness).
- **GCC Optimize Options**: "-O2: Optimize even more. GCC performs nearly all supported optimizations that do not involve a space-speed tradeoff"; the enabled list includes `-finline-functions`, `-fcode-hoisting`, `-fschedule-insns`, `-ftree-loop-vectorize`.
- **Clang UsersManual - PGO**: "Profile information enables better optimization. For example, knowing that a branch is taken very frequently helps the compiler make better decisions when ordering basic blocks. Knowing that a function foo is called more frequently than another function bar helps the inliner"; "be careful to collect profiles by running your code with inputs that are representative of the typical behavior."
- **cppreference setvbuf + man7 read(2)**: "The default buffer size BUFSIZ is expected to be the most efficient buffer size for file I/O on the implementation"; read(2) is a section-2 system-call manual page.
- **cppreference restrict**: "The intended use of the restrict qualifier (like the register storage class) is to promote optimization"; "the programmer must ensure that the aliasing assertions made by the restrict-qualified pointers are not violated"; "compiler free to optimize, vectorize, page map, etc."
- **cppreference rand**: "Each time rand() is seeded with srand(), it must produce the same sequence of values." - verbatim.
- **cppreference qsort**: "If comp indicates two elements as equivalent, their order in the resulting sorted array is unspecified." - verbatim.
- **Clang ThreadSanitizer**: "ThreadSanitizer is a tool that detects data races. It consists of a compiler instrumentation module and a run-time library"; "Supported Platforms: ... Darwin arm64"; the sample report shows both conflicting accesses with stacks.
- **Clang SourceBasedCodeCoverage** (`test-coverage`): the page **contradicts the Why**: "Each branch is tied to individual conditions in the source code that may each evaluate to either 'true' or 'false'. These conditions may comprise larger boolean expressions linked by boolean logical operators. For example, 'x = (y == 2) || (z < 10)' is a boolean expression comprised of two individual conditions ... producing four total branch outcomes." - see reject.
- **cppreference `_Alignof`**: "Returns the alignment requirement of the type named by type-name." The page does not state target/ABI variation; that claim was verified with cross-target probes (below).
- **cppreference array**: "In each function call to a function where an array parameter uses the keyword static between [ and ], the value of the actual parameter must be a valid pointer to the first element of an array with at least as many elements as specified by expression".
- **cppreference integer**: `intmax_t` = "maximum-width signed integer type other than a bit-precise integer type"; `uintmax_t` likewise; `PRIdMAX` documented.
- **cppreference arithmetic types** (`type-bit-int`): "`_BitInt(n)` (also accessible as `signed _BitInt(n)`), the bit-precise signed integer types (where n is replaced by an integer constant expression denoting the precise width (including the sign bit) ...)"; `unsigned _BitInt(n)` likewise. No dedicated cppreference `_BitInt` page exists; the arithmetic-types page documents the feature, so the citation is appropriate (the C23 status page is an equivalent alternative).
- **cppreference generic**: "Provides a way to choose one of several expressions at compile time, based on a type of a controlling expression".
- **cppreference `_Alignas`**: "the declared object will have its alignment requirement set to ... the result of the expression ... except when this would weaken the alignment the type would have had naturally."

## Behavior and tool harness results

- `api-validate-params` (ASan+UBSan): Good `setfile` returns -1 for NULL and for a stream with `feof` set, 0 for a usable stream; the stored pointer is only updated on success.
- `api-error-policy`: Good returns the same `enum io_status` from both entry points; the Bad mixes `1` (failure) and `-1`+errno conventions.
- `api-commit-rollback` (ASan+UBSan): Bad half-updates on failure (`name=new, retries=3, unchanged=0`); Good leaves the struct byte-identical (`unchanged=1`) and commits on success (`name=new, retries=5`).
- `api-destroy-function` (ASan): Bad caller `free(handle_state(h))` then `free(h)` - ASan "attempting double-free" at the second free (the embedded state sits at offset 0); the Good `handle_destroy(h)` runs ASan-clean.
- `const-pointer-fixed`: probe `current = &other;` -> "error: cannot assign to variable 'current' with const-qualified type 'int *const'"; `*current = 5;` compiles (pointee writable).
- `const-string-literals`: Bad write to a literal exits SIGBUS (rc=138; literals live in read-only `__TEXT` on this host); under `const char *` the same write is a compile error; Good prints normally.
- `const-local-readonly`: probe `scaled = 3;` -> "error: cannot assign to variable 'scaled' with const-qualified type 'const int'".
- `net-message-framing` (TCP loopback, two frames in one segment): Bad single `recv` returns 18 bytes (both messages merged, boundary lost); Good reads 4-byte length + 5 bytes twice -> "hello", "world".
- `net-shutdown-eof` (TCP loopback): client `send("ping")` + `shutdown(SHUT_WR)` -> server `recv` 4 then 0 (EOF); client still reads the reply "pong" then EOF. Close-with-unread-data scenario: server `send` = -1 (EPIPE), next `recv` = -1 errno=ECONNRESET - the reset case the Why cites.
- `perf-optimize-release`: Good loop at -O2 compiles to `ldr q0, [x0]; addv.4s s0, v0; fmov w0, s0; ret` (vectorized), byte-identical to the hand-unrolled Bad at -O2; -O0 keeps the loop. Hand-unrolling duplicates what -O2 does.
- `perf-pgo`: full cycle `-fprofile-generate` -> run -> `llvm-profdata merge` -> `-fprofile-use` builds and runs (macOS raw profile name is `default_<hash>_0.profraw`). The toy `classify()` was branchless under both builds, so no layout delta was observable; the documented workflow itself was exercised end-to-end.
- `perf-io-batching`: 12.7 MB file, 400000 lines: read-per-byte 5918.6 ms vs `fgetc` 230.3 ms (25.7x), identical counts.
- `perf-restrict-hot-loops`: Bad -O2 emits a runtime overlap check, then either a vectorized path (`ldp q..` / `add.4s` / `stp q..`) or a scalar fallback with reloads; Good -O2 emits the vector loop directly with no checks. Both are reported "vectorized loop (width 4, interleaved count 4)" by `-Rpass=loop-vectorize`.
- `test-seed-prng`: `srand(42)` twice -> 705894 both; fixed-seed shuffle identical across runs; clock-seeded first values one second apart differ.
- `test-deterministic-compare`: key-only comparator over two different initial orders of the same multiset -> different order of equal keys (memcmp differs); total-order comparator -> byte-identical results.
- `test-tsan-threaded`: `clang -fsanitize=thread` on the Bad worker -> "WARNING: ThreadSanitizer: data race" with both conflicting stacks; the atomic Good runs clean.
- `test-coverage` (`llvm-cov show --show-branches=count`, only `decide(50)` executed): the folded `if (value > 100 || value == 50)` prints **Branch (4:9) [True: 0, False: 1]** and **Branch (4:24) [True: 1, False: 0]** - both sub-conditions are instrumented separately. `llvm-cov report` counts 4 branches / 2 missed for the folded version, exactly as for the split Good. The untested sub-case is not hidden.
- `type-alignof`: native `alignof(long)` = 8; `--target=x86_64-pc-windows-msvc` static assert `alignof(long) == 4` passes; on i386/i686 the struct layout places `long long`/`double` at offsets 4/12 vs 8/16 on arm64.
- `type-static-array-min`: `fill(int small[4])` against `fill(int dst[static 8])` -> clang `-Warray-bounds`: "array argument is too small; contains 4 elements, callee requires at least 8".
- `type-intmax`: native `sizeof(intmax_t)` = 8 = `sizeof(long)`; Windows target `sizeof(long)` = 4 but `intmax_t`/`uintmax_t` = 8; `PRIdMAX` expands to "jd" and `UINTMAX_MAX` prints.
- `type-bit-int`: `sizeof(_BitInt(24))` = 4, `_BitInt(40)` = 8; max signed 24-bit = 8388607; fixed widths are 1/2/4/8 (no 24).
- `type-generic`: `name_of(1)` = "int", `name_of(1L)` = "long", `name_of(1.0)` / `name_of("x")` = "other".
- `type-alignas`: `offsetof` of the buffer is 1 in the plain struct vs 64 in the over-aligned struct; `alignof` is 1 vs 64; a global `alignas(64)` buffer is 64-byte aligned.

## Reject detail

**`c-api-validate-params` (rejected)** - The cited URL `https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/application-programming-interfaces-api/api00-c/` returns **HTTP 404** (curl and webfetch; no redirects; `index.html`, `.html`, and `http://` variants also 404; no Wayback snapshot). The page exists only at `.../recommendations/application-programming-interfaces-api/api00-c/` (HTTP 200, title "API00-C. Functions should validate their parameters"); sibling API pages and the site's own category payload use the `/recommendations/` path, while other categories' `/rules/` URLs resolve. The body, snippets, and source content all verify against the canonical page. Fix: change the path segment `rules` to `recommendations` in `sources`.

**`c-api-commit-rollback` (rejected)** - Same dead URL (only these two rules cite it). The canonical API00-C page contains the exact sentence the Why relies on ("implementing commit or rollback semantics (leaving program state unchanged on error) is a desirable practice for error safety") and its compliant solution leaves `myFile` unchanged on error. Fix: same one-segment URL correction.

**`c-test-coverage` (rejected)** - The Why is false against its own cited source and against the tool. The page states branch coverage is "tied to individual conditions" and gives `(y == 2) || (z < 10)` as two conditions with four branch outcomes; `llvm-cov show --show-branches=count` on the rule's Bad prints separate `Branch` entries for `value > 100` and `value == 50` with independent true/false counts, and `llvm-cov report` counts the same 4 branches / 2 missed as the split Good. "Folding two distinct cases into one `if` therefore hides the untested one behind a covered branch" is not how source-based coverage works. Fix: rewrite the Why around a supported claim (condition/MC/DC complexity, both documented on the same page) or drop the rule.

## Non-blocking notes

- **`api-validate-params` vs `ptr-null-check`**: adjacent but distinct decisions (where validation lives vs null specifically); cross-linked. Moot while the rule is rejected for the URL.
- **`api-error-policy` vs `err-status-return`**: distinct (one uniform convention across the API vs the convention itself); cross-linked.
- **`test-deterministic-compare` vs `data-qsort-stability`**: same tie-breaker mechanism, different failure mode (flaky test via `memcmp` of sorted arrays vs general output order); cross-linked, kept distinct.
- **`api-destroy-function` vs `pat-init-destroy` / `mem-single-owner`**: per-object destroy vs subsystem start/stop vs general ownership; distinct.
- **`perf-restrict-hot-loops` vs `ptr-restrict-contract`**: performance side vs safety side of restrict; complementary, cross-linked.
- **`const-pointer-fixed`**: the page shows both placements (`double * const x`, `const double * const y`, `char * const *pcp`) and the assignability rules, but not the literal `int *const cp` example named in the Why; the semantics were confirmed by compile probes.
- **`net-shutdown-eof`**: the close-reset/discard clause is not on the shutdown(2) page; it was demonstrated empirically (ECONNRESET after close with unread data). Consider citing close(2)/socket(7) for that sentence.
- **`perf-pgo`**: the manual documents the PGO benefits; the anti-`__builtin_expect` framing is the author's argument, not the source's. The local toy produced branchless code either way, so no layout delta was observable; the workflow itself was exercised end-to-end.
- **`perf-restrict-hot-loops`**: clang 21 versions the no-restrict loop (runtime overlap check + vector path + scalar fallback), so "emits scalar code with reloads" is imprecise; the restrict advantage (no versioning overhead) is real.
- **`type-alignof`**: the page defines the operator but does not state target/ABI variation; the variability claim is demonstrated (long: 8 native vs 4 Windows; 64-bit struct members 4-aligned on i386) and the query-don't-assume decision stands.
- **`type-generic`**: the title says "parallel accessor names" while the Bad demonstrates enum-keyed dispatch; both are the same idea (caller names the variant) and the summary matches the body.
- **`type-bit-int`**: no dedicated cppreference `_BitInt` page; arithmetic types documents the bit-precise types. Accepted (C23 status page is an equivalent alternative).
- **INDEX bookkeeping**: the C `INDEX.md` header still reads `Rules: 265 (verified: 214)`; after this batch the pack holds 262 verified of 265. The owner should refresh the count (the verifier does not edit INDEX per ownership).
- The validator's remaining 8 warnings (comment elisions in `macro-va-opt`, `obs-debug-default-off`, `obs-no-side-effect-args`) are outside this batch. Batch 10 (`conc`/`data`) files were not touched.

## Formatting, validator, duplicates, links

- All 23: id/path match, `lang: c`, `baseline: latest`, valid severity/enforce, exact section order, exactly one `c` fence per Bad/Good (4 fences/file), snippets <= 25 lines, summaries <= 30 words, no TODO/hedging/elision tokens, no `compile_exempt`.
- All `related` ids and See Also targets resolve; all INDEX entries match titles (the pack convention).
- Deterministic validator with compilation enabled (`validate --lang c --json`): 265/265 checked, 0 errors, 8 warnings - none in this batch.
- Duplicates: Jaccard scan over all 265 summaries/titles found no pair above 0.5; manual reads of the closest siblings (`ptr-null-check`, `err-status-return`, `data-qsort-stability`, `ptr-restrict-contract`, `pat-init-destroy`, `mem-single-owner`, `pat-length-prefixed`) confirmed distinct decisions.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-api-validate-params | **rejected** | cited `/rules/...api00-c/` URL is HTTP 404 (webfetch + curl, no redirects, no Wayback); canonical page at `/recommendations/...` supports the Why and Good; one-segment URL fix; both snippets rc=0 |
| c-api-error-policy | verified | ERR00-C: "Components and routines should always generate status indicators"; "Consistency ... with respect to critically similar parts" - verbatim; harness shows enum statuses; both rc=0 |
| c-api-commit-rollback | **rejected** | same dead API00-C URL; canonical page's "commit or rollback semantics (leaving program state unchanged on error)" supports the Why; harness: Bad half-updates, Good unchanged=1; both rc=0 |
| c-api-destroy-function | verified | MEM00-C: allocate/free "at the same level of abstraction and, ideally, in the same code module"; ASan double-free on the Bad caller, Good clean; both rc=0 |
| c-const-pointer-fixed | verified | cppreference const: const-qualified lvalues not assignable, pointee side independent; probe: rebinding `int *const` is a hard error, `*current = 5` allowed; both rc=0 |
| c-const-string-literals | verified | cppreference string literals: static storage, modification UB, `.rodata`; Bad write exits SIGBUS, const probe is a compile error; both rc=0 |
| c-const-local-readonly | verified | cppreference const: read-only placement + modification UB; probe reassignment is a compile error; both rc=0 |
| c-net-message-framing | verified | tcp(7): "TCP does not preserve record boundaries"; loopback harness: Bad merges 2 frames (18 bytes), Good recovers "hello"/"world"; both rc=0 |
| c-net-shutdown-eof | verified | shutdown(2): SHUT_WR disallows further transmissions; harness: EOF observed while reply still readable; close-with-unread-data produced EPIPE/ECONNRESET; both rc=0 |
| c-perf-optimize-release | verified | GCC -O2 enables `-finline-functions`/`-fcode-hoisting`/`-fschedule-insns` etc.; Good loop at -O2 = hand-unrolled Bad (vectorized `addv.4s`); both rc=0 |
| c-perf-pgo | verified | Clang manual documents profile-guided branch ordering/inlining and representative runs; full `-fprofile-generate` -> `llvm-profdata merge` -> `-fprofile-use` cycle exercised; both rc=0 |
| c-perf-io-batching | verified | setvbuf: "default buffer size BUFSIZ is expected to be the most efficient buffer size for file I/O"; harness: 5918.6 ms vs 230.3 ms (25.7x); both rc=0 |
| c-perf-restrict-hot-loops | verified | cppreference restrict: aliasing assertion, "promote optimization", "free to ... vectorize"; asm: Bad versioned (runtime check + scalar fallback), Good vector loop, no checks; both rc=0 |
| c-test-seed-prng | verified | cppreference rand: "Each time rand() is seeded with srand(), it must produce the same sequence of values."; harness: fixed seed reproducible, clock seed varies; both rc=0 |
| c-test-deterministic-compare | verified | cppreference qsort: equivalent elements' order "unspecified"; harness: key-only comparator reorders equals between runs, total order identical; both rc=0 |
| c-test-tsan-threaded | verified | Clang TSan: detects data races, Darwin arm64 supported; probe: "WARNING: ThreadSanitizer: data race" with both stacks on the Bad, atomic Good clean; both rc=0 |
| c-test-coverage | **rejected** | Why contradicted by the cited page ("Each branch is tied to individual conditions ... four total branch outcomes") and by `llvm-cov`: folded condition shows separate Branch entries (4:9)/(4:24) and 4 branches / 2 missed; both rc=0 |
| c-type-alignof | verified | cppreference `_Alignof`: returns the alignment requirement; cross-target probes: long 8 native vs 4 Windows, 64-bit members 4-aligned on i386; both rc=0 |
| c-type-static-array-min | verified | cppreference array: `static` in `[]` means at least N elements; clang `-Warray-bounds`: "array argument is too small; contains 4 elements, callee requires at least 8"; both rc=0 |
| c-type-intmax | verified | cppreference integer: `intmax_t`/`uintmax_t` = maximum-width types, `PRIdMAX` documented; native 8/8, Windows long 4 vs intmax 8; both rc=0 |
| c-type-bit-int | verified | arithmetic types: `_BitInt(n)` bit-precise types with exact width; harness: sizeof 4/8, max signed 24-bit 8388607, no fixed 24-bit type; both rc=0 |
| c-type-generic | verified | cppreference generic: chooses an expression at compile time from the controlling expression's type; harness: int/long/other dispatch correct; both rc=0 |
| c-type-alignas | verified | cppreference `_Alignas`: sets the object's alignment requirement, cannot weaken it; harness: offsetof 1 vs 64, alignof 1 vs 64, global buffer 64-aligned; both rc=0 |

## Counts

- Verified: **20/23** (api 2, const 3, net 2, perf 4, test 3, type 6)
- Rejected: **3/23** (`c-api-validate-params`, `c-api-commit-rollback`, `c-test-coverage`)
- Blockers: (1) `c-api-validate-params` and (2) `c-api-commit-rollback` - replace `rules` with `recommendations` in the cited API00-C URL (`.../recommendations/application-programming-interfaces-api/api00-c/`, HTTP 200); the bodies need no change. (3) `c-test-coverage` - rewrite the Why so it no longer claims compound conditions hide sub-cases (the cited page and llvm-cov show per-condition branch entries); consider MC/DC or condition-complexity framing, or drop the rule.
- Non-blocking notes as listed above (adjacent-rule distinctness, `const-pointer-fixed` example names, `net-shutdown-eof` close citation, `perf-pgo` framing, `perf-restrict-hot-loops` wording, `type-alignof` variation source, `type-generic` title, `type-bit-int` citation alternative, INDEX count refresh).

Only the 20 passing `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed. Batch 10 (`conc`/`data`) files were not modified.

# Addendum - Re-check of the three rejected rules (2026-10-05)

After the fixes landed, the three rejected rules were re-verified with the same toolchain. The two API rules changed only the cited URL; `test-coverage` was rewritten around the MC/DC distinction.

## Re-check method

- Re-fetched the corrected URL; re-extracted and re-compiled the six snippets with `clang -fsyntax-only -std=c23 -Wall`.
- For `test-coverage`: re-read the cited Clang SourceBasedCodeCoverage page and ran MC/DC harnesses with Xcode LLVM 21 - the folded Bad compiled both with and without `-fcoverage-mcdc`, executed with `decide(50)`, and inspected via `llvm-cov report --show-mcdc-summary` and `llvm-cov show --show-mcdc`; the split Good was compiled with `-fcoverage-mcdc` for comparison.
- Re-ran the format/link/INDEX checks and the deterministic validator with compilation enabled.

## Results

- **`c-api-validate-params` - verified (flipped).** URL is now `https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/application-programming-interfaces-api/api00-c/`; re-fetched HTTP 200, title "API00-C. Functions should validate their parameters". Body unchanged; both snippets rc=0, zero diagnostics. Claims were already confirmed against the canonical page (compliant solution `if (file && !ferror(file) && !feof(file)) { myFile = file; return 0; }`).
- **`c-api-commit-rollback` - verified (flipped).** Same corrected URL (HTTP 200); body unchanged; both snippets rc=0. The page's "implementing commit or rollback semantics (leaving program state unchanged on error) is a desirable practice for error safety" supports the Why.
- **`c-test-coverage` - verified (flipped).** The reframed Why is supported by the cited page: "MC/DC is the percentage of individual branch conditions that have been shown to independently affect the decision outcome..."; "MC/DC builds on top of branch coverage and requires that all code blocks and all execution paths have been tested"; "This statistic is hidden by default in reports, but it can be enabled via the -show-mcdc-summary option as long as code was also compiled using the clang option -fcoverage-mcdc"; "Boolean expressions comprised of only one condition ... are not included in MC/DC analysis and are trivially deducible using branch coverage". Empirical: without `-fcoverage-mcdc`, `llvm-cov report --show-mcdc-summary` reports 0 MC/DC conditions (cover "-") and `llvm-cov show --show-mcdc` shows no MC/DC region; with the flag, the folded Bad shows "MC/DC Decision Region (4:9) to (4:35)" with C1/C2, and with only `decide(50)` executed "C1-Pair: not covered / C2-Pair: not covered / MC/DC Coverage for Decision: 0.00%" while branch coverage is 50%; the split Good shows 0 MC/DC conditions with its branches tracked (single-condition decisions, as the page states). Both snippets rc=0. Title/summary/Why/Bad/Good are coherent; the INDEX title was already updated by the fixer.

## Non-blocking notes (addendum)

- `test-coverage`: the `>` summary is the same sentence as the title (the only such pair in the pack; allowed but redundant), and `triggers.keywords` does not include `MC/DC` (author may want to add it).

## Counts (final)

- Batch 11: **verified 23/23, rejected 0** - `c-api-validate-params`, `c-api-commit-rollback`, and `c-test-coverage` flipped after re-check.
- C pack: **265/265 verified** (deterministic validator with compilation enabled: 0 errors, 8 warnings - all outside this batch).
- In the re-check only the three `status:` fields and this addendum were changed by the verifier; the URL/title/body fixes were the fixer's. No git operations were performed.
