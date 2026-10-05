# Verification Report - C Batch 5 (`proj` + `doc`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `proj-*.md` + 12 `doc-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; Xcode clang-format 21.0.0; deterministic validator `node dist/rules/cli.js validate --lang c --no-compile --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/c-batch5` (fetched pages, extracted snippets, harnesses)

## Method

1. Fetched all 17 distinct cited URLs with `curl -L` (all HTTP 200) and extracted the claim-specific passages quoted below.
2. Extracted both fenced snippets from each rule (48 snippets) and compiled each with the advertised command `clang -fsyntax-only -std=c23 -Wall`: 48/48 exit 0 with zero diagnostics (the batch's zero-diagnostics claim holds).
3. Built and ran bounded offline harnesses for every runtime claim: include guards (double inclusion, preprocessed-output counts), internal linkage (`nm`), feature macros (macOS `__DARWIN_C_LEVEL` probe), header declarations (two-TU link), NDEBUG assertions (with/without `-DNDEBUG`), nodiscard/deprecated/static_assert diagnostics, sanitizer exit codes, `clang --analyze`, a libFuzzer availability probe plus a direct pure-function driver, the clang-format CI gate, `-Wall -Wextra` suppression, reserved-name collision with `<fcntl.h>`, and `-std`/`-pedantic-errors` dialect behavior.
4. Ran the deterministic validator on the C pack; mechanically re-checked frontmatter, section order, one `c` fence per Bad/Good, summary/Why/keyword counts, line caps, banned tokens/elisions, `related`/See Also/INDEX links, and near-duplicates.
5. Flip policy: only rules passing every check were flipped to `status: verified`; the one reject was left `draft`.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 48/48 snippets exit 0 with no diagnostics. The tooling-rule Bad snippets (sanitizers, static-analysis, fuzzing, format, language-standard, warning-level) compile clean by design - their failure mode is the tool's target, not a compile error (verify prompt check 3); each is demonstrated below by the corresponding tool or flag.

## Source evidence (claim-specific)

- **assert**: "If NDEBUG is defined as a macro name at the point in the source code where <assert.h> is included, then assert does nothing" (`proj-assertions-build`).
- **feature_test_macros(7)**: "In order to be effective, a feature test macro must be defined before including any header files ... because header files may freely include one another" (`proj-feature-macros`).
- **ClangFormat**: `--dry-run`/`-n` and `--Werror` documented; `--style=file` loads a `.clang-format` from a parent directory - the checked-in-config + CI gate claim (`proj-format`).
- **libFuzzer**: fuzz target "accepts an array of bytes and does something interesting with these bytes"; `LLVMFuzzerTestOneInput(Data, Size)`; "coverage-guided" (`proj-fuzzing`).
- **cppreference extern**: "there must be one and only one external definition for that identifier somewhere in the entire program"; tentative definitions may merge or disagree in linkage (`proj-header-declarations`).
- **GCC Once-Only Headers**: double inclusion is processed twice and "very likely to cause an error"; wrapper `#ifndef` skips the second processing; guard macro "should not begin with `_`" and "should contain the name of the file and some additional text" (`proj-include-guards`).
- **DCL37-C**: `__`/`_Upper` reserved for any use, any leading underscore reserved at file scope, external-linkage library names always reserved, declaring/defining a reserved identifier is undefined behavior; noncompliant include-guard example (`proj-reserved-identifiers`, `proj-include-guards`).
- **cppreference storage_duration**: `static` at file scope gives internal linkage, referable from all scopes of the current translation unit (`proj-internal-linkage`).
- **GCC C Dialect Options**: `gnu23` "This is the default for C code"; a base standard still accepts GNU extensions that do not contradict it; "The particular standard is used by -Wpedantic to identify which features are GNU extensions" (`proj-language-standard`).
- **UBSan**: `-fsanitize=undefined` inserts checks; for most checks the program "prints a verbose error report and **continues execution**"; `-fno-sanitize-recover=...` makes it exit (`proj-sanitizers` - basis for the reject below).
- **Clang Static Analyzer**: "path-sensitive, inter-procedural analysis based on symbolic execution"; scan-build command-line usage (`proj-static-analysis`).
- **MSC00-C**: "Compile code using the highest warning level ... and eliminate warnings by modifying the code"; "Do not simply quiet warnings by adding type casts or other means" (`proj-warning-level`).
- **Kernel style**: comments "tell WHAT your code does, not HOW"; "put the comments at the head of the function"; "use just one data declaration per line"; prototypes "include parameter names with their data types"; comment after `#endif` "at the end of any non-trivial #if or #ifdef block"; error-code vs boolean returns are "a fertile source of difficult-to-find bugs" (`doc-contract`, `doc-data-comments`, `doc-endif`, `doc-failure-returns`, `doc-param-names`, `doc-what-not-how`).
- **cppreference deprecated**: "Compilers typically issue warnings on such uses. The string-literal, if specified, is usually included in the warnings" (`doc-deprecated`).
- **cppreference nodiscard**: string-literal "usually included in the warnings"; example output shows the reason appended (`doc-nodiscard-reason`).
- **cppreference static_assert**: message-bearing syntax with a compile-time-error example; since C23 `static_assert` is a keyword and `<assert.h>` no longer provides it (`doc-static-assert`).
- **Doxygen**: brief description is a "short one-liner" used for tooltips; `@param`/`@return` example; a `/** @file */` line is required to document file-scope objects (`doc-doxygen-brief`, `doc-doxygen-params`, `doc-file-purpose`).

## Behavior harness results

- `proj-include-guards`: guarded header content appears once in the preprocessed TU after a double include vs twice unguarded; an unguarded header with a `static` function fails with "error: redefinition of 'helper'". Note: the Bad's identical `struct` redefinition is accepted under clang C23 (see non-blocking notes).
- `proj-internal-linkage`: `nm -g` - Bad exports `T _normalize` and `T _read_level`; Good exports only `T _read_level`.
- `proj-feature-macros`: macOS probe - `_POSIX_C_SOURCE=200809L` before includes hides `asprintf` ("use of undeclared identifier"); defined after `<stdio.h>` the macro is ineffective and `asprintf` stays visible (rc=0) - the exact man-page failure mode, reproduced on the local platform.
- `proj-header-declarations`: definition in a header included by two TUs - "duplicate symbol '_max_level'" link failure; declaration + one definition in a source file links and runs.
- `proj-assertions-build`: Bad (in-file `#define NDEBUG`) prints `scale(-1)=-2`, no abort; Good aborts with SIGABRT (rc=134); Good built with `-DNDEBUG` prints `-2` - file-local switch and both build configurations demonstrated.
- `doc-nodiscard-reason`: caller warning text includes the reason: "ignoring return value of function declared with 'nodiscard' attribute: ignoring the status loses the parse error".
- `doc-deprecated`: caller warning includes the replacement: "'old_lookup' is deprecated: use lookup_v2, which reports errors".
- `doc-static-assert`: Good compiles (`sizeof(struct header) == 8` holds on this target); adding a field fails with "static assertion failed ... : header layout changed: update the wire format".
- `proj-sanitizers`: Bad under `-fsanitize=undefined,address` aborts with ASan `heap-buffer-overflow` (rc=134), Good rc=0; **UBSan default on signed overflow prints "runtime error" and exits 0**; only `-fno-sanitize-recover=all` exits 134.
- `proj-static-analysis`: `clang --analyze` on Bad reports "Dereference of null pointer ... [core.NullDereference]"; Good is clean.
- `proj-fuzzing`: the Xcode clang lacks the libFuzzer runtime (`libclang_rt.fuzzer_osx.a` not found), so no in-process fuzz run; the Good function is directly callable with arbitrary bytes (driver returns `11`/`-1`/`-1`), while the Bad is hard-wired to stdin.
- `proj-format`: with a checked-in `.clang-format` (IndentWidth 4), `clang-format --dry-run --Werror` rejects Bad (rc=1) and accepts Good (rc=0, unchanged).
- `proj-warning-level`: Bad `(void)out` compiles clean under `-Wall -Wextra`; the same code without the cast warns "unused parameter 'out' [-Wunused-parameter]"; Good uses the parameter.
- `proj-reserved-identifiers`: Bad alone compiles; with `<fcntl.h>` it fails "conflicting types for 'open'"; `nm -g` shows the Bad exports `T _open`.
- `proj-language-standard`: Bad accepted by `-std=c23 -Wall` (rc=0) and by `-std=gnu23`; rejected by `-std=c23 -pedantic-errors` with "use of GNU statement expression extension"; Good clean under `-pedantic-errors`.
- `doc-endif`: both snippets preprocess/compile; annotation-only rule.

## Reject detail

**`c-proj-sanitizers` (rejected)** - The Why says "The sanitizers insert checks for exactly these conditions and abort with a diagnostic at the point of violation", and the summary promises "latent UB and memory errors fail the run". The cited UBSan page states that for most checks the instrumented program "prints a verbose error report and continues execution upon a failed check"; the harness confirms a signed-overflow UB run exits 0 under `-fsanitize=undefined`. Only the ASan half aborts by default. A test suite run with the documented flags can therefore "pass" while UB diagnostics were printed. Fix: reword to "report" (or add `-fno-sanitize-recover=all` / `UBSAN_OPTIONS=halt_on_error=1` so UB actually fails the run) and re-verify.

## Non-blocking notes

- `proj-include-guards`: under C23, redeclaring an identical `struct` is valid (N3220 6.7.3.4 requires compatible types; clang `-std=c23 -pedantic-errors` accepts the double include), so the Bad's struct alone no longer "fails the build"; the failure is demonstrated with a `static` function (redefinition error) and remains real for non-identical definitions, typedefs/enums before C11/C23, and function/object definitions. The guard decision and the guard-skip mechanism are fully verified.
- `proj-language-standard`: plain `-std=c23` still accepts the GNU statement expression (measured rc=0); the Why correctly states that `-pedantic` is what surfaces it, but the summary's "not accepted by accident" is a compression of `-std` + `-pedantic`.
- `proj-reserved-identifiers`: `open` is reserved by POSIX, not by ISO C; the Bad's "collides with the standard library's open" is loose, and the collision only manifests once `<fcntl.h>` is included (verified). The cited DCL37-C page notes POSIX extends the reserved set.
- `proj-fuzzing`: libFuzzer runtime is not shipped with the local Apple clang; the entry-point claim is source-backed and structurally demonstrated, but no coverage-guided run was possible locally.
- `doc-contract`, `doc-failure-returns`: the cited kernel Commenting section supports documenting WHAT a function does (and kernel-doc for API functions) and the error-code/boolean distinction; the specific contract elements (nullability, length units, ownership) and the "at its declaration" placement are standard practice beyond the cited text.
- `doc-doxygen-brief`: the Doxygen page states brief descriptions are used for tooltips; "indexes and auto-completion" are not verbatim on the cited page.

## Formatting, validator, duplicates, links

- All 24: id/path match, `lang: c`, `baseline: latest`, valid severity/enforce values, exact section order, exactly one `c` fence per Bad/Good, summaries 12-19 words, Why 2-5 sentences, keywords 2-8, snippets <= 25 lines, no banned tokens/elisions/hedges, all `related` ids and See Also links resolve with id text, and `INDEX.md` lists all 24 files with matching summaries.
- Deterministic validator (`--no-compile --json`): zero errors and zero warnings in this batch (the only pack findings are `sec-file-mode` and `obs-*`, other batches, outside scope).
- No duplicate or near-duplicate pair within the batch; highest internal title+summary Jaccard is 0.31 (`doc-contract` vs `doc-param-names`, distinct decisions). Closest cross-batch pair is outside scope.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-doc-contract | verified | kernel Commenting "tell WHAT ... at the head of the function" + kernel-doc for API; both rc=0; contract-element specifics noted as practice |
| c-doc-data-comments | verified | kernel "use just one data declaration per line ... room for a small comment on each item"; both rc=0 |
| c-doc-deprecated | verified | cppreference deprecated warning/string text; caller warning contains "use lookup_v2, which reports errors"; both rc=0 |
| c-doc-doxygen-brief | verified | Doxygen brief "short one-liner" + tooltip text + `\brief`; both rc=0; "indexes/auto-completion" not verbatim (note) |
| c-doc-doxygen-params | verified | Doxygen `@param`/`@return` examples; both rc=0 |
| c-doc-endif | verified | kernel "at the end of any non-trivial #if or #ifdef block, place a comment after the #endif"; both rc=0 |
| c-doc-failure-returns | verified | kernel "Function return values and names" mixing text; both rc=0; documentation decision inferred from convention (note) |
| c-doc-file-purpose | verified | Doxygen requires `/** @file */` to document file-scope objects; both rc=0 |
| c-doc-nodiscard-reason | verified | cppreference "string-literal ... usually included in the warnings"; measured warning includes the reason; both rc=0 |
| c-doc-param-names | verified | kernel 6.1 "include parameter names with their data types"; both rc=0 |
| c-doc-static-assert | verified | cppreference message-bearing syntax; layout change fails with the author message; `sizeof == 8` holds; both rc=0 |
| c-doc-what-not-how | verified | kernel "NEVER ... HOW ... tell WHAT"; Good comment states purpose at function head; both rc=0 |
| c-proj-assertions-build | verified | cppreference NDEBUG text; run: Bad no-op, Good SIGABRT (134), `-DNDEBUG` no-op; both rc=0 |
| c-proj-feature-macros | verified | feature_test_macros(7) "before including any header files"; darwin probe: late define ineffective (`asprintf` still visible); both rc=0 |
| c-proj-format | verified | ClangFormat `--dry-run --Werror` + `.clang-format`; Bad rc=1, Good rc=0 unchanged; both snippets rc=0 |
| c-proj-fuzzing | verified | libFuzzer "array of bytes"/`LLVMFuzzerTestOneInput(Data,Size)`/coverage-guided; Good directly callable; libFuzzer runtime absent locally (note); both rc=0 |
| c-proj-header-declarations | verified | cppreference one-definition rule; Bad "duplicate symbol '_max_level'", Good links/runs; both rc=0 |
| c-proj-include-guards | verified | GCC once-only text (skip + non-reserved name); guarded content once vs twice; unguarded static function redefinition error; C23 identical-struct nuance noted; both rc=0 |
| c-proj-internal-linkage | verified | cppreference storage_duration internal linkage; `nm`: Bad exports `_normalize`, Good does not; both rc=0 |
| c-proj-language-standard | verified | GCC gnu23 "default for C code" + -Wpedantic extension identification; Bad rejected by `-pedantic-errors`, accepted by c23/gnu23; Good clean; both rc=0 |
| c-proj-reserved-identifiers | verified | DCL37-C reserved/UB text; `<fcntl.h>` conflict and exported `_open`; both rc=0; POSIX-vs-ISO wording noted |
| c-proj-sanitizers | **rejected** | Why "abort with a diagnostic" contradicted by cited UBSan page ("prints a verbose error report and continues execution") and by run: signed-overflow UBSan exit 0; `-fno-sanitize-recover=all` needed for rc=134. ASan half works (Bad heap-buffer-overflow rc=134, Good rc=0); both snippets compile |
| c-proj-static-analysis | verified | Clang Static Analyzer path-sensitive/symbolic-execution text; `clang --analyze` finds Bad "Dereference of null pointer", Good clean; both rc=0 |
| c-proj-warning-level | verified | MSC00-C "eliminate warnings by modifying the code" + "Do not simply quiet warnings by adding type casts"; `(void)out` suppresses `-Wunused-parameter`, Good uses it; both rc=0 |

## Counts

- Verified: 23/24 (11 proj, 12 doc)
- Rejected: 1/24 (`c-proj-sanitizers`)
- Blockers: reword `c-proj-sanitizers` so UB failures actually fail the run (or state that UBSan reports and continues) and re-verify.
- Non-blocking notes: C23 identical-struct redeclaration weakens `proj-include-guards`' struct example (function-definition failure demonstrated); `proj-language-standard` summary compresses `-std` + `-pedantic`; `proj-reserved-identifiers`' `open` is POSIX-reserved; libFuzzer runtime unavailable locally; `doc-contract`/`doc-failure-returns`/`doc-doxygen-brief` have small unsourced flourishes.
- `INDEX.md` currently reads `Rules: 146 (verified: 72)` with batch 5 "(in verification)"; after these 23 flips it should read `verified: 95` (owner update; not touched by this verifier).

Only the 23 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched.

---

# Addendum - `c-proj-sanitizers` re-verified (2026-10-05)

`c-proj-sanitizers` re-checked after the fix: the Why now matches the cited UBSan page (verbose error report, recovers and continues by default, `-fno-sanitize-recover=all` exits) and the summary no longer claims a default failure; both snippets rc=0 under `clang -fsyntax-only -std=c23 -Wall`, UBSan signed overflow rc=0 by default vs rc=134 with `-fno-sanitize-recover=all`, Bad under `-fsanitize=undefined,address` rc=134 (heap-buffer-overflow) / Good rc=0 - flipped to `verified`; final count **verified 24/24, rejected 0**.
