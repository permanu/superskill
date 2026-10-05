# Verification Report - C Batch 6 (`anti` + `obs`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `anti-*.md` + 12 `obs-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; deterministic validator `node dist/rules/cli.js validate --lang c --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/cb6` (fetched pages, extracted snippets, behavior harnesses)

## Method

1. Fetched all 10 distinct cited URLs with `curl -L` and extracted the claim-specific passages quoted below. All resolve HTTP 200 except the `anti-shadowing` citation, which 404s (see reject detail).
2. Extracted both fenced snippets from each rule (48 snippets) and compiled each with the advertised command `clang -fsyntax-only -std=c23 -Wall`: 48/48 exit 0 with zero diagnostics (the batch's zero-diagnostics claim holds).
3. Built and ran bounded, offline harnesses for every runtime claim: `fflush` on input, exit status with a forced `fopen` failure, stderr-vs-stdout capture, once-only rate limiting (5 calls), locale formatting under `LC_ALL=de_DE.UTF-8` (plus a `setlocale(LC_ALL, "")` control), a `raise(SIGTERM)` signal-handler run, side effects in disabled log arguments, and the parenthesized-vs-bare assignment warning behavior.
4. Ran the deterministic validator and mechanically re-checked frontmatter, section order, one `c` fence per Bad/Good, summary/Why/keyword counts, line caps, banned tokens/elisions, trailing whitespace, `related`/See Also/INDEX links, and near-duplicates.
5. Flip policy: only rules passing every check were flipped to `status: verified`; both rejects were left `draft`.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 48/48 snippets exit 0 with no diagnostics. No rule uses `compile_exempt`. In particular, `anti-assignment-in-condition`'s Bad uses the parenthesized form deliberately: the bare `if (a = b)` form warns (`-Wparentheses`), the shown `if ((a = b))` form is silent, and the inline comment marks the assignment as a mistake (see notes).

## Source evidence (claim-specific)

- **EXP45-C**: noncompliant `if (a = b)` is "frequently a case of the programmer mistakenly using the assignment operator `=` instead of the equals operator `==`"; contexts table covers `if`, `while`, `do...while`, `for`, `?:`, `&&`, `||`, `,`; EX1 permits `(x = y) != 0` and EX2 permits `if ((x = y))` (single primary expression) when the assignment is intentional (`anti-assignment-in-condition`).
- **DCL01-C**: cited `rules/...` URL returns HTTP 404; the page lives at `recommendations/declarations-and-initialization-dcl/dcl01-c` and says "Do not use the same variable name in two scopes where one scope is contained in another"; the noncompliant example is exactly a local `msg` hiding a global `msg` and sized with the global's `msgsize` (`anti-shadowing` - basis for the reject).
- **MEM12-C**: a `goto` chain is "the simplest and cleanest way to organize exits while preserving the order of freed resources"; the guideline "does not advocate more general uses of goto" (`anti-goto-control-flow`).
- **cppreference fflush**: "For input streams (and for update streams on which the last operation was input), the behavior is undefined"; POSIX and Microsoft extensions are noted as platform-specific (`anti-fflush-input`).
- **cppreference setlocale**: locale can be `""` (user-preferred) or `"C"` (minimal); "During program startup, the equivalent of `setlocale(LC_ALL, "C");` is executed before any user code is run"; the example shows `de_DE.utf8` LC_NUMERIC producing `3,14` (`obs-locale-independent` - basis for the reject).
- **cppreference exit**: `EXIT_FAILURE` yields "an implementation-defined status indicating unsuccessful termination"; the page's example uses `exit(EXIT_FAILURE)` on `fopen` failure (`obs-exit-status`).
- **cppreference std streams**: `stderr` is "used for writing diagnostic output" and "is not fully buffered"; `stdout` is "conventional output" and may be fully buffered (`obs-stderr-vs-stdout`).
- **signal-safety(7)**: "the stdio library, all of whose functions are not async-signal-safe"; stdio "must maintain a statically allocated data buffer along with associated counters and indexes"; a second `printf` from a handler "will operate on inconsistent data, with unpredictable results" (`obs-signal-handler`).
- **Kernel coding style**: "Centralized exiting of functions" (goto for common cleanup; "If there is no cleanup needed then just return directly"); "Do not use the `extern` keyword with function declarations"; "don't use preprocessor conditionals (`#if`, `#ifdef`) in .c files" and `IS_ENABLED` constant-folding; "if you need more than 3 levels of indentation, you're screwed anyway"; `count_active_users()` vs `cntusr()` and Hungarian notation "is asinine - the compiler knows the types anyway"; "Generally, inline functions are preferable to macros resembling functions" and macros' "expression with side effects evaluated more than once"; functions "short and sweet", locals "shouldn't exceed 5-10"; "a mistake to use typedef for structures and pointers"; "Make the messages concise, clear, and unambiguous" and "Printing numbers in parentheses (%d) adds no value"; `dev_*`/`pr_*` helpers match messages to device/driver and "tagged with the right level"; `pr_debug` "is compiled out by default, unless either DEBUG is defined or CONFIG_DYNAMIC_DEBUG is set"; "WARN_ON_ONCE() is generally preferred ... because ... a given warning condition ... [may] occur multiple times. This can fill up and wrap the kernel log" (`anti-extern-functions`, `anti-goto-control-flow`, `anti-ifdef-in-source`, `anti-deep-nesting`, `anti-abbreviations`, `anti-function-macro`, `anti-inline-abuse`, `anti-long-function`, `anti-typedef-struct-pointer`, `obs-concise-message`, `obs-debug-default-off`, `obs-levels`, `obs-module-tag`, `obs-rate-limit`, `obs-runtime-verbosity`, `obs-single-interface`).

## Behavior harness results

- `anti-fflush-input`: on this platform `fflush(stdin)` returned 0 and left the next character (`'b'`) pending - the "silently does nothing" extension; the Good consumed `bc\n` and the next read returned `'d'`. The standard's UB sentence is the authoritative basis.
- `obs-exit-status`: with `fopen` forced to fail (run inside a `chmod 555` directory), Bad exit status 0, Good exit status 1.
- `obs-stderr-vs-stdout`: Bad's diagnostic was captured on stdout (`cannot open missing.cfg` in the stdout file, empty stderr); Good's diagnostic appeared only on stderr; both exit 1.
- `obs-rate-limit`: 5 calls to `on_retry` produced 5 stderr lines (Bad) vs 1 (Good).
- `obs-locale-independent`: **under `LC_ALL=de_DE.UTF-8` both the Bad and the Good print `rate=1.50`**; a control that calls `setlocale(LC_ALL, "")` first prints `rate=1,50`, and adding `setlocale(LC_NUMERIC, "C")` restores `rate=1.50`. The Bad comment "separator follows the environment locale" is false for the snippet as written (see reject detail).
- `obs-signal-handler`: bounded `raise(SIGTERM)` run - Bad's handler wrote to stderr from the handler; Good set the `sig_atomic_t` flag and logged from the main context. The safety claim is source-backed; the run only demonstrates the deferral pattern.
- `obs-no-side-effect-args`: Bad without `-DDEBUG` left the counter at 3 (decrement vanished); with `-DDEBUG` the counter became 2; Good decremented in both builds.
- `anti-assignment-in-condition`: bare `if (a = b)` warns `-Wparentheses` ("place parentheses around the assignment to silence this warning"); the rule's parenthesized Bad produces zero diagnostics, and `/* assignment, not comparison */` plus the `is_same` name make the unintended-assignment intent clear.

## Reject detail

**`c-anti-shadowing` (rejected)** - The single cited source URL, `https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/declarations-and-initialization-dcl/dcl01-c/`, returns HTTP 404 (`curl -L`; also 404 without the trailing slash). DCL01-C now lives under the recommendations section: `.../recommendations/declarations-and-initialization-dcl/dcl01-c` (HTTP 200, content matches the Why, including the `msg`/`msgsize` example). Per CONTRACT section 5, "URLs must resolve"; the citation must be corrected and re-verified. Secondary defect: the Good snippet drops the `if (result > 100) result = 100;` clamp that the Bad's inner computation contained, so the "fixed" function returns unclamped `value * 2 + 1` (for `value = 60`: 121, where the Bad's apparent intent was 100). Both snippets compile; fix the URL and preserve the clamp.

**`c-obs-locale-independent` (rejected)** - The Bad comment "separator follows the environment locale" is false for the snippet as written. A C program starts in the `"C"` locale (cppreference setlocale: startup executes `setlocale(LC_ALL, "C")`), and only `setlocale(LC_ALL, "")` adopts the environment; the snippet never calls it. Measured: both Bad and Good print `rate=1.50` under `LC_ALL=de_DE.UTF-8`; the control with `setlocale(LC_ALL, "")` prints `rate=1,50`. Consequently the Good's `setlocale(LC_NUMERIC, "C")` is a no-op in this snippet - the pair does not demonstrate the hazard or the fix. Fix: call `setlocale(LC_ALL, "")` in both snippets (Bad adopts the environment and prints; Good adopts it, then forces `LC_NUMERIC` to `"C"` before printing) and re-verify.

## Non-blocking notes

- `anti-assignment-in-condition`: the rule is deliberately stricter than CERT EXP45-C EX1/EX2 (CERT permits an intentional assignment wrapped in a comparison or as a single primary expression). The Bad is parenthesized so no `-Wall` diagnostic fires and the comment carries the intent; the See Also phrase "the warning this triggers" is loose because the shown form triggers none (the bare form does).
- `anti-ifdef-in-source`: the Good keeps an `#ifndef BIG_BUFFERS / #define BIG_BUFFERS 0` defaulting block in the .c; the rule's decision expression is the foldable constant, consistent with the kernel's `IS_ENABLED` guidance, though the defaulting conditional is itself a preprocessor conditional in a source file.
- `obs-runtime-verbosity`: "dynamic debug lets a running system enable messages without a rebuild" is the documented purpose of `CONFIG_DYNAMIC_DEBUG`; the cited section only names the option and contrasts it with per-file `#define DEBUG`.
- `obs-single-interface`: "destination ... decided in one place" is a light extrapolation; the cited section supports matching device/driver and level through one helper family (`dev_*`/`pr_*`).
- `obs-no-side-effect-args`: "Kernel style's `pr_debug` exists in both forms" is terse; the compile-out reasoning is sound and run-confirmed.
- Validator: the only findings for this batch are 6 `comment-elision` warnings (`obs-debug-default-off` x2, `obs-no-side-effect-args` x4) that are false positives on the variadic `#define debug_log(...)` lines; CONTRACT section 12 marks `...`-in-comment warnings as non-blocking.

## Formatting, validator, duplicates, links

- All 24: id/path match, required frontmatter present, `lang: c`, `baseline: latest`, valid severity/enforce values, exact section order, exactly one `c` fence per Bad/Good, summaries 11-18 words, Why sections hedge-free, keywords 2-8, snippets 1-16 lines (<= 25), no banned tokens/elisions/trailing whitespace, all `related` ids and See Also link targets resolve, and `INDEX.md` lists all 24 files with matching summaries.
- Deterministic validator (`--lang c --json`): zero errors for this batch (other pack findings - `sec-file-mode`, `style-bool`, `num-*` index entries - are outside scope).
- Duplicates: highest internal pair is `obs-no-side-effect-args` vs `unsafe-assert-side-effects` (title+summary Jaccard 0.33) - distinct macros (debug log vs `assert`), distinct sources, cross-referenced siblings, no merge required. `anti-fflush-input` vs `io-no-alternating-io` (0.31) is complementary (never flush an input stream vs the defined flush between output and input), cross-referenced. No duplicate or near-duplicate pair within the batch.
- Severities: the `anti` mix is defensible under CONTRACT section 3 - `must` for correctness/UB/wrong-object bugs (assignment-in-condition, fflush-input, shadowing), `should` for idiomatic defaults (goto, deep-nesting, ifdef, function-macro, long-function), `prefer` for taste (abbreviations, extern, inline, typedef). Same mapping holds for `obs`.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-anti-abbreviations | verified | kernel Naming: `cntusr()` vs `count_active_users()`, "shooting offense", Hungarian notation "asinine"; both rc=0 |
| c-anti-assignment-in-condition | verified | EXP45-C noncompliant `if (a = b)` + contexts table; Bad parenthesized (zero diagnostics; bare form warns `-Wparentheses`), comment makes intent clear; rule stricter than EX1/EX2 (note); both rc=0 |
| c-anti-deep-nesting | verified | kernel Indentation: "> 3 levels of indentation ... fix your program"; both rc=0 |
| c-anti-extern-functions | verified | kernel 6.1 verbatim: "Do not use the extern keyword with function declarations"; both rc=0 |
| c-anti-fflush-input | verified | cppreference: input-stream behavior "undefined"; macOS run: `fflush(stdin)` returns 0, no-op; Good consumes to newline; both rc=0 |
| c-anti-function-macro | verified | kernel 12: inline functions preferable; "side effects evaluated more than once"; both rc=0 |
| c-anti-goto-control-flow | verified | MEM12-C goto-chain + "does not advocate more general uses of goto"; kernel "Centralized exiting"; both rc=0 |
| c-anti-ifdef-in-source | verified | kernel 21: no `#if/#ifdef` in .c; header stubs; `IS_ENABLED` constant-folds; Good's defaulting `#ifndef` noted; both rc=0 |
| c-anti-inline-abuse | verified | kernel 15: bigger icache footprint, "> 3 lines" rule of thumb, static-used-once inlined automatically; both rc=0 |
| c-anti-long-function | verified | kernel 6: "short and sweet ... one or two screenfuls"; locals "shouldn't exceed 5-10"; both rc=0 |
| c-anti-shadowing | **rejected** | cited DCL01-C URL HTTP 404 (content at `recommendations/...`, matches Why); Good also drops the Bad's clamp (`value=60` -> 121 not 100); both rc=0 |
| c-anti-typedef-struct-pointer | verified | kernel 5: "a mistake to use typedef for structures and pointers"; "never be a typedef"; both rc=0 |
| c-obs-concise-message | verified | kernel 13: "concise, clear, and unambiguous"; parenthesized `%d` "adds no value"; both rc=0 |
| c-obs-debug-default-off | verified | kernel 13: `pr_debug` "compiled out by default, unless ... DEBUG ... or CONFIG_DYNAMIC_DEBUG"; both rc=0 |
| c-obs-exit-status | verified | cppreference exit: `EXIT_FAILURE` = unsuccessful termination; run: Bad rc=0, Good rc=1 on forced `fopen` failure; both rc=0 |
| c-obs-levels | verified | kernel 13: `dev_err`/`dev_warn`/`pr_warn`/`pr_err` level tagging; both rc=0 |
| c-obs-locale-independent | **rejected** | Bad comment false: startup locale is `"C"`; both snippets print `rate=1.50` under `LC_ALL=de_DE.UTF-8`; control with `setlocale(LC_ALL, "")` prints `1,50`; Good's call is a no-op as written; both rc=0 |
| c-obs-module-tag | verified | kernel 13: `dev_*` "matched to the right device and driver"; `pr_*` for non-device messages; both rc=0 |
| c-obs-no-side-effect-args | verified | kernel 13 `pr_debug` compiled out; run: Bad counter 3 (no DEBUG) vs 2 (DEBUG), Good 2 both; both rc=0 |
| c-obs-rate-limit | verified | kernel 22: `WARN_ON_ONCE()` preferred, flood "can fill up and wrap the kernel log"; run: Bad 5 lines, Good 1; both rc=0 |
| c-obs-runtime-verbosity | verified | kernel 13: `CONFIG_DYNAMIC_DEBUG` vs per-file `#define DEBUG`; "without a rebuild" is the option's documented purpose (note); both rc=0 |
| c-obs-signal-handler | verified | signal-safety(7): stdio "not async-signal-safe", static buffers, "inconsistent data"; bounded run defers via `sig_atomic_t`; scoped to logging; both rc=0 |
| c-obs-single-interface | verified | kernel 13: `dev_*`/`pr_*` helper families; "destination" lightly extrapolated (note); both rc=0 |
| c-obs-stderr-vs-stdout | verified | cppreference: stderr = "diagnostic output", "not fully buffered"; run: Bad diagnostic on stdout, Good on stderr; both rc=0 |

## Counts

- Verified: 22/24 (11 anti, 11 obs)
- Rejected: 2/24 (`c-anti-shadowing`, `c-obs-locale-independent`)
- Blockers: (1) fix `c-anti-shadowing`'s DCL01-C URL to the `recommendations/...` path and preserve the Bad's clamp in the Good, then re-verify; (2) fix `c-obs-locale-independent` by adding `setlocale(LC_ALL, "")` to both snippets so the Bad actually adopts the environment locale, then re-verify.
- Non-blocking notes: `anti-assignment-in-condition` is stricter than EXP45-C EX1/EX2 and its See Also wording is loose; `anti-ifdef-in-source`'s Good retains a defaulting `#ifndef`; `obs-runtime-verbosity`/`obs-single-interface`/`obs-no-side-effect-args` have small extrapolations/terse phrasing; validator comment-elision warnings are false positives on variadic macros.
- `INDEX.md` currently reads `Rules: 146 (verified: 72)` (stale; 116 files verified pack-wide before this batch). After these 22 flips the pack total should read verified: 138; batch 6 should be marked verified except the two rejects (owner update; not touched by this verifier).

Only the 22 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.

---

# Addendum - Re-verification of the two rejects (2026-10-05)

Both rejected rules were fixed by the author and re-checked from scratch; `status: draft` was kept until this re-verification passed.

## c-anti-shadowing (now verified)

- **Source URL fixed**: `.../recommendations/declarations-and-initialization-dcl/dcl01-c/` now returns HTTP 200 (`curl -L`); content supports the Why (DCL01-C "Do not use the same variable name in two scopes where one scope is contained in another"; the local `msg` hiding a global `msg` and sized with the global's `msgsize` example).
- **Clamp preserved in the Good**: the fixed Good adds `if (doubled > 100) doubled = 100;`. Compiled both snippets clean (`clang -fsyntax-only -std=c23 -Wall`, rc=0, zero diagnostics). Behavior driver: Bad `adjust(60)=60`, `adjust(0)=0` (inner computation lost to shadowing); Good `adjust(60)=100`, `adjust(0)=1` - the intended double-increment-clamp computation, so the contrast holds.
- Mechanical re-check: id/path match, single `status:` line, exactly one `c` fence per Bad/Good, See Also links resolve, no trailing whitespace/banned tokens.

## c-obs-locale-independent (now verified)

- **Snippets fixed**: both now call `setlocale(LC_ALL, "")` to adopt the environment locale; the Good then forces `setlocale(LC_NUMERIC, "C")` (checked for NULL). The Why now states the startup C-locale default ("At startup the C locale is in effect, so a program must adopt the environment with `setlocale(LC_ALL, "")` before locale-dependent formatting appears"), matching cppreference setlocale ("During program startup, the equivalent of `setlocale(LC_ALL, "C");` is executed before any user code is run").
- **Behavior re-run** (Apple clang 21.0.0, `de_DE.UTF-8` available): Bad `LC_ALL=de_DE.UTF-8` -> `rate=1,50` (genuinely locale-dependent); Good same env -> `rate=1.50`; both print `rate=1.50` under `LC_ALL=C`; Good also `1.50` with `LC_ALL`/`LANG` unset. The earlier defect (Bad comment false, Good call vacuous) is resolved.
- Compiled both snippets clean (`clang -fsyntax-only -std=c23 -Wall`, rc=0, zero diagnostics); mechanical re-check same as above; source URL 200.

## Addendum verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-anti-shadowing | verified | DCL01-C `recommendations/...` URL HTTP 200; Good now clamps (adjust(60)=100 vs Bad 60); both rc=0 |
| c-obs-locale-independent | verified | Bad de_DE `1,50`, Good de_DE `1.50`, both C `1.50`; Why matches startup-locale text; both rc=0 |

## Final counts

- Batch 6 verified: **24/24**; rejected: 0/24.
- Pack-wide verified files: 140 at the time of this re-check (up from 138); other batches are being verified concurrently (145 measured moments later), so the owner should recompute the total for the INDEX update. INDEX still reads 72 and is stale.

