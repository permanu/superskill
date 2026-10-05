# Verification Report - C Batch 9 (`ffi` + `lint`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `ffi-*.md` + 12 `lint-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; Homebrew GCC 14.2.0; Homebrew LLVM clang-tidy 20.1.2; cppcheck 2.22.0; deterministic validator `node dist/rules/cli.js validate --lang c --no-compile --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/c-batch9` (fetched pages, extracted snippets, probes, harnesses)

## Method

1. Fetched all 18 distinct cited URLs (man7 `dlsym(3)` and `feature_test_macros(7)`; CERT DCL09-C, MSC22-C, MSC00-C; cppreference `extern`, `time_t`, `va_copy`, `arithmetic_types`; GCC Common Attributes and Static Analyzer Options; kernel `botching-up-ioctls`; clang-tidy, JSON Compilation Database, clang Diagnostics Reference; cppcheck repository; IWYU; Valgrind Quick Start) and confirmed each claim against the page text. Extra pages fetched where the cited page was not specific enough (cppreference `va_arg`, `type`, `string/wide`, `types/limits`; clang-tidy `bugprone-branch-clone`).
2. Extracted both fenced snippets from each rule (48 snippets) and compiled each with the advertised command `clang -fsyntax-only -std=c23 -Wall`: 48/48 exit 0 with zero diagnostics. No rule uses `compile_exempt`.
3. Built and ran harnesses for every checkable behavior: `va_copy` forwarding (ASan+UBSan), `setjmp` contexts (UBSan), packed-struct `offsetof` + misaligned access (UBSan `-fsanitize=alignment`), the `dlsym`/`dlerror` protocol, wchar/time/off_t widths across targets (`-dM` predefines and runtime `sizeof`), GCC `-fanalyzer` double free, clang-tidy `bugprone-branch-clone`, cppcheck `nullPointer`, `-Wstrict-prototypes` in C17 vs C23 (clang and GCC), `format`/`nonnull` call-site checking, `-Wconversion`/`-Wshadow`/`-Wcast-align`/`-Wvla`, and pragma suppression scope.
4. For rules whose tools are not installable on this host (IWYU, Valgrind), verified every claim against the official docs (Valgrind is not supported on current macOS).
5. Ran the deterministic validator (compile skipped, since clang covered compilation) and mechanically re-checked frontmatter, section order, one `c` fence per Bad/Good, summary word counts, snippet line caps, banned tokens, `related`/See Also/INDEX links, and near-duplicates (Jaccard summary scan plus manual reads of the closest siblings).
6. Flip policy: only rules passing every check were flipped to `status: verified`; the four rejects were left `draft`.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 48/48 snippets exit 0 with no diagnostics.

## Source evidence (claim-specific)

- **man7 dlsym(3)** (`ffi-dlsym-conversion`): "a NULL return from dlsym() need not indicate an error. The correct way to distinguish an error from a symbol whose value is NULL is to call dlerror(3) to clear any old error conditions, then call dlsym(), and then call dlerror(3) again, saving its return value ... and check whether this saved value is not NULL" - matches the Good exactly.
- **CERT DCL09-C** (`ffi-error-type`): `errno_t` makes the error-number contract explicit, and the page shows the exact fallback `#ifndef __STDC_LIB_EXT1__ / typedef int errno_t; / #endif` used in the Good.
- **man7 feature_test_macros(7)** (`ffi-offset-width`): `_FILE_OFFSET_BITS=64` "automatically converts references to 32-bit functions and data types related to file I/O and filesystem operations into references to their 64-bit counterparts"; `_FILE_OFFSET_BITS` "is not specified by any standard, but is employed on some other implementations" - width depends on per-TU compile settings.
- **GCC Common Attributes** (`ffi-packed-struct`, `ffi-symbol-visibility`, `lint-format-attribute`, `lint-nonnull-annotation`): `packed` gives a member "the smallest possible alignment - ... one byte otherwise"; `visibility("hidden")` keeps a symbol inside the shared object; `format` "causes the compiler to check the arguments in calls ... for consistency with the ... format string"; `nonnull` "indicates that the referenced arguments must be non-null" and `-Wnonnull` warns at calls (also feeds `-Wanalyzer-null-argument`).
- **CERT MSC22-C** (`ffi-setjmp-context`): `setjmp` outside the standard's contexts is UB (the page's noncompliant example is exactly `int i = setjmp(buf);`), and `longjmp` must never return to a function that has terminated.
- **cppreference extern** (`ffi-shared-globals`, `ffi-shared-prototypes`): external declarations are the program's link surface; one external definition per identifier; tentative/linkage disagreements are UB.
- **cppreference time_t** (`ffi-time-format`): "Real arithmetic type"; "Although not defined by the C standard, this is almost always an integral value holding the number of seconds ... since 00:00, Jan 1 1970 UTC" - width/epoch/units are not standard-fixed.
- **cppreference va_copy** (`ffi-va-copy`): `va_copy` makes an independent list and each copy must be released with `va_end`; `va_arg` (C17 7.16.1.1) makes `ap` indeterminate after being consumed by another function.
- **Kernel botching-up-ioctls** (`ffi-versioned-struct`): "since getting things wrong on the first attempt is guaranteed you will have a second iteration"; "Have a plan for extending ioctls with new flags or new fields at the end of the structure"; the drm core "checks the passed-in size for each ioctl call".
- **Clang clang-tidy docs + bugprone-branch-clone page** (`lint-clang-tidy`): checks are chosen with `-checks=` as comma-separated globs; `bugprone` and `cert` families exist (129 checks match `cert-*,bugprone-*` locally); clang-tidy "can also run Clang Static Analyzer checks"; branch-clone "Checks for repeated branches in `if/else if/else` chains".
- **Clang JSON Compilation Database spec** (`lint-compile-commands`): "a format for specifying how to replay single compilations independently of the build system"; command objects carry the working directory and the exact command (including `-D` defines).
- **Cppcheck repository** (`lint-cppcheck`): repository description "static analysis of C/C++ code"; `nullPointer` exists in `lib/checknullpointer.cpp`, `duplicateCondition` in `lib/checkcondition.cpp`, and the manual's `style` category covers "redundant code".
- **Clang Diagnostics Reference** (`lint-float-equal`, `lint-opt-in-warnings`, `lint-strict-prototypes`): `-Wfloat-equal` "comparing floating point with == or != is unsafe"; `-Wconversion`, `-Wshadow`, `-Wcast-align`, `-Wvla` are all documented as opt-in families; `-Wstrict-prototypes` text is "a function declaration without a prototype is deprecated in all versions of C".
- **GCC Static Analyzer Options** (`lint-gcc-analyzer`): `-fanalyzer` enables path-sensitive warnings including `-Wanalyzer-double-free`, `-Wanalyzer-use-after-free`, `-Wanalyzer-div-by-zero`; `-Wanalyzer-too-complex` is documented separately ("By default, the analysis silently stops ... The -Wanalyzer-too-complex option warns if this occurs").
- **IWYU** (`lint-iwyu`): "for every symbol ... that you use ... either foo.cc or foo.h should #include a .h file that exports the declaration"; the tool removes superfluous includes and reports violations.
- **CERT MSC00-C** (`lint-suppression-scope`): `#pragma warning(push)`/`pop` is the compliant pattern; the `default` specifier "resets the behavior of a warning to its default value, which may not be the same as its previous behavior".
- **Valgrind Quick Start** (`lint-valgrind`): Memcheck "can detect many memory-related errors ... and leaks" with stack traces, and reports uses of uninitialised values; "definitely lost"/"probably lost" leaks; "Try to make your program so clean that Memcheck reports no errors".

## Behavior and tool harness results

- `ffi-dlsym-conversion`: Good harness on `RTLD_DEFAULT` returns rc=-1 for a missing symbol and a real address with `dlerror()` empty for `getpid`; the Bad shape returns a bare pointer with no way to tell missing from null-valued.
- `ffi-packed-struct`: `offsetof(struct header, length) == 1`, `sizeof == 5`; UBSan `-fsanitize=alignment`: "load of misaligned address ... for type 'unsigned int', which requires 4 byte alignment"; clang also emits `-Waddress-of-packed-member`. Good keeps natural alignment.
- `ffi-va-copy`: Good prints `v=42 s=ok` twice with ASan+UBSan clean; the Bad double-consume is UB per C17 7.16.1.1 (not observably caught on this host).
- `ffi-setjmp-context`: Good runs (`run=-1`); the Bad assignment form is UB per the C standard/CERT (UBSan does not model it).
- `ffi-wchar-format`: `__SIZEOF_WCHAR_T__` = 4 and `__WCHAR_MAX__` = 2147483647 (signed) on this host vs 2 and 65535 (unsigned) for `--target=x86_64-pc-windows-msvc` - the width/signedness claim is true but is not stated by the cited page (see reject).
- `ffi-time-format`: `sizeof(time_t) == 8` here; feature_test_macros documents `_TIME_BITS` changing `time_t` width.
- `ffi-offset-width`: `sizeof(off_t) == 8` on Darwin; the 32/64 split is glibc-specific and documented in the cited man page.
- `lint-clang-tidy`: clang-tidy 20.1.2 on the Bad snippet with `-checks='-*,bugprone-branch-clone'`: "if with identical then and else branches [bugprone-branch-clone]"; Good clean.
- `lint-cppcheck`: cppcheck 2.22.0 reports `nullPointer` ("Possible null pointer dereference: s") on the Bad snippet at the line the comment names, plus `ctunullpointer`; Good clean. A duplicate-condition probe reports `multiCondition` / `identicalConditionAfterEarlyExit`.
- `lint-gcc-analyzer`: gcc-14 `-fanalyzer -c` on the Bad snippet: "double-'free' of 'p' [CWE-415] [-Wanalyzer-double-free]" with a path trace; Good clean. But `gcc-14 -fanalyzer -Q --help=warnings` shows `-Wanalyzer-too-complex [disabled]` (and the docs' enabled list omits it) - see reject.
- `lint-float-equal`: `-Wfloat-equal` warns on the Bad, Good clean; `-Wall` alone does not warn on the Bad.
- `lint-format-attribute`: Bad wrapper + mismatched call: no diagnostic; Good wrapper + same call: `-Wformat` "format specifies type 'int' but the argument has type 'char *'".
- `lint-nonnull-annotation`: Bad (unannotated) + `span_len(NULL, 1)`: no diagnostic; Good (`nonnull(1)`) + same call: `-Wnonnull` "null passed to a callee that requires a non-null argument". `__attribute__((access(read_only, 1)))` is ignored by clang 21 with `-Wunknown-attributes` (GCC accepts it), so avoiding `access` was the right call.
- `lint-opt-in-warnings`: Bad warns under `-Wconversion` ("implicit conversion loses integer precision"), Good clean; `-Wshadow` ("declaration shadows a local variable"), `-Wcast-align` ("increases required alignment from 1 to 4"), `-Wvla` ("variable length array used") all fire as documented.
- `lint-strict-prototypes`: `int reset();` - clang `-std=c17 -Wstrict-prototypes` warns, but `-std=c23 -Wstrict-prototypes` emits nothing (GCC 14 `-std=gnu23` likewise); calling `reset(1, 2)` under C23 is a hard error "too many arguments to function call, expected 0, have 2" - see reject.
- `lint-suppression-scope`: file-wide `#pragma clang diagnostic ignored` suppresses a later function's `-Wconversion` warning too; `push`/`ignored`/`pop` leaves the later warning intact. The mechanism and the CERT push/pop source are sound; the rule is blocked by a frontmatter parse error (see reject).
- `lint-iwyu`, `lint-valgrind`: source-verified only (tools unavailable/uninstallable on this host).

## Reject detail

**`c-ffi-wchar-format` (rejected)** - The cited source (`cppreference - Arithmetic types`) only name-drops `wchar_t` ("the standard library also defines typedef names `wchar_t`, `char16_t` and `char32_t` to represent wide characters"); it says nothing about width, encoding, or signedness being implementation-defined, which is the entire Why. The claim is true (this host: 4 bytes, signed; Windows target: 2 bytes, unsigned) but the citation does not support it. Fix: cite a source that states it, e.g. cppreference `types/limits` (WCHAR_WIDTH/WCHAR_MIN/WCHAR_MAX are "implementation-defined value") or ISO C 7.19, and keep the body.

**`c-lint-gcc-analyzer` (rejected)** - The Why claims "The analyzer notes when its exploration limits are hit via `-Wanalyzer-too-complex`, so silence is distinguishable from truncation." That is only true if the flag is explicitly enabled: GCC's Static Analyzer Options page lists `-Wanalyzer-too-complex` outside the set that `-fanalyzer` "effectively enables" and says "By default, the analysis silently stops"; locally `gcc-14 -fanalyzer -Q --help=warnings` reports `-Wanalyzer-too-complex [disabled]`. Under the rule's own instruction (build with `-fanalyzer`), silence is not distinguishable. Everything else is verified (double-free trace above). Fix: add `-Wanalyzer-too-complex` to the recommended flags and say so.

**`c-lint-strict-prototypes` (rejected)** - Under the C23 baseline the rule's mechanism is false. C23 makes `()` in a declaration mean "no parameters": clang 21 `-std=c23 -Wstrict-prototypes` emits no diagnostic for `int reset();` (GCC 14 `-std=gnu23` likewise), and a call with arguments is a hard error ("too many arguments to function call, expected 0, have 2"), so the Why's "declare an unspecified argument list ... callers can then pass arguments that are never checked" no longer holds. The warning only fires in pre-C23 modes (verified with `-std=c17`). Fix: either scope the rule to pre-C23 compatibility or rewrite the Why to state that C23 removed the hazard and `(void)` is now stylistic; as written it cannot ship against `baseline: latest`.

**`c-lint-suppression-scope` (rejected)** - Deterministic validator error `fm-parse`: "invalid YAML frontmatter: bad indentation of a mapping entry at line 17, column 3". The `sources:` entry's `url:` line is indented two spaces instead of four, so the frontmatter does not parse (js-yaml). Body, source, and behavior probes all pass (above). Fix: indent `url:` under `- title:` with four spaces.

## Non-blocking notes

- **Analyzer-rule distinctness**: the three analyzer rules are genuinely distinct and none is a duplicate - clang-tidy is the configurable check framework (probed: branch-clone), GCC `-fanalyzer` is path-sensitive within one compiler (probed: double-free), cppcheck is a compiler-independent second opinion with its own preprocessor (probed: nullPointer). They share only the "run a tool in CI" shape, which the pack already treats as review-enforced (`proj-static-analysis`).
- **`lint-compile-commands` adjacency**: the decision (emit `compile_commands.json`) is backed by the Clang spec; the C snippets cannot show JSON, so the Bad/Good demonstrate the complementary tooling-visibility practice (a defaulted build define in the header). This is one coherent idea (make build configuration visible to tools) and is distinct from `proj-feature-macros` (ordering feature-test macros) and the macro rules. Accepted.
- **`access` attribute avoidance**: verified - clang 21 ignores `__attribute__((access(...)))` (`-Wunknown-attributes`) while GCC supports it; `nonnull(1)` is the portable annotation and its call-site check was probed working.
- `ffi-time-format`: the cited page supports "not standard-fixed/unspecified" but not literally "width has changed historically"; the operative variability claim is supported and the sharper citation (`feature_test_macros`, `_TIME_BITS`) already exists in the pack. Not blocking.
- `lint-valgrind`: "needs no rebuild" is relative to the sanitizers; the Quick Start recommends `-g` but no special build. Not blocking.
- `lint-suppression-scope`: the rule's own snippets use explicit `(int)value` casts, which `-Wconversion` would not flag anyway; the scoping mechanism was probed with implicit narrowing. The decision and source are sound; only the YAML indentation blocks the rule.
- `lint-cppcheck`: the cited repository URL redirects to `github.com/cppcheck-opensource/cppcheck`; the named checks were confirmed in the repository's source and manual rather than the README. Not blocking.
- ffi type-format rules (`off_t`, `time_t`, `wchar_t`) are distinct instances of `conv-fixed-width` with different failure mechanisms (per-TU build settings, epoch/units, encoding/signedness); no duplicate pair was found (Jaccard summary scan and manual reads of all closest siblings).

## Formatting, validator, duplicates, links

- All 24: id/path match, `lang: c`, `baseline: latest`, valid severity/enforce, exact section order, exactly one `c` fence per Bad/Good, snippets <= 25 lines, summaries <= 30 words, no TODO/elisions, all `related` ids and See Also targets resolve, `INDEX.md` lists all 24 with matching summaries (242 index entries = 242 rule files).
- Deterministic validator (`--lang c --no-compile --json`): ruleCount 242, checkedCount 240; batch result 1 error (`lint-suppression-scope` fm-parse, above), 0 warnings. The other pack error and all warnings are outside this batch.
- Duplicates: no duplicate or near-duplicate pair found (no repeated titles; no summary pair above 0.5 Jaccard).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-ffi-dlsym-conversion | verified | dlsym(3) dlerror protocol verbatim; protocol harness: missing rc=-1, found symbol + empty dlerror; both rc=0 |
| c-ffi-error-type | verified | DCL09-C `errno_t` rationale + exact fallback typedef; both rc=0 |
| c-ffi-offset-width | verified | feature_test_macros: `_FILE_OFFSET_BITS` converts 32-bit I/O types to 64-bit counterparts, non-standard macro; both rc=0 |
| c-ffi-packed-struct | verified | GCC packed = smallest alignment; harness offsetof=1/sizeof=5, UBSan misaligned load, `-Waddress-of-packed-member`; both rc=0 |
| c-ffi-setjmp-context | verified | MSC22-C UB for assignment context and terminated-function longjmp; Good runs; both rc=0 |
| c-ffi-shared-globals | verified | cppreference extern: external linkage/link surface, one definition rule; both rc=0 |
| c-ffi-shared-prototypes | verified | same source: external declarations fix the type for every caller; both rc=0 |
| c-ffi-symbol-visibility | verified | GCC visibility: hidden keeps the entity inside the shared object, supported on Darwin; both rc=0 |
| c-ffi-time-format | verified | cppreference time_t: unspecified real arithmetic type, epoch/units not standard-fixed; sizeof=8 here; both rc=0 |
| c-ffi-va-copy | verified | cppreference va_copy + C17 7.16.1.1 indeterminacy; harness prints values twice correctly under ASan/UBSan; both rc=0 |
| c-ffi-versioned-struct | verified | kernel ioctls: second iteration guaranteed, extend at end, size checked; both rc=0 |
| c-ffi-wchar-format | **rejected** | cited arithmetic_types page only name-drops `wchar_t`; it does not state implementation-defined width/encoding/signedness (the whole Why). Claim itself true (4/signed here vs 2/unsigned Windows target); cite types/limits or C 7.19; both rc=0 |
| c-lint-clang-tidy | verified | docs: glob-selected check groups incl. bugprone/cert, runs analyzer checks; clang-tidy 20 probe fires bugprone-branch-clone on Bad, Good clean; both rc=0 |
| c-lint-compile-commands | verified | JSON compilation database spec: replay exact commands incl. defines; Good shows the tool-visible default when no database exists (distinct from macro rules); both rc=0 |
| c-lint-cppcheck | verified | repo: static analysis of C/C++; cppcheck 2.22 reports nullPointer on the exact Bad line, Good clean; duplicateCondition/checkcondition confirmed in source; both rc=0 |
| c-lint-float-equal | verified | Diagnostics Reference `-Wfloat-equal`; probe warns on Bad, Good clean, `-Wall` silent on Bad; both rc=0 |
| c-lint-format-attribute | verified | GCC format attribute enables call-site checking; probe: no warning without, `-Wformat` with; both rc=0 |
| c-lint-gcc-analyzer | **rejected** | `-Wanalyzer-too-complex` is disabled by default under `-fanalyzer` (docs list it outside the enabled set; `gcc-14 -Q` [disabled]), so "silence is distinguishable from truncation" is false as written; double-free part verified; both rc=0 |
| c-lint-iwyu | verified | IWYU site: include-what-you-use rule, removes superfluous includes, reports violations; both rc=0 |
| c-lint-nonnull-annotation | verified | GCC nonnull contract + `-Wnonnull`; probe: unannotated silent, annotated warns; clang ignores `access`, so the choice is sound; both rc=0 |
| c-lint-opt-in-warnings | verified | Diagnostics Reference for `-Wconversion/-Wshadow/-Wcast-align/-Wvla`; all four probed firing; Bad warns / Good clean under `-Wconversion`; both rc=0 |
| c-lint-strict-prototypes | **rejected** | C23 makes `()` mean no parameters: clang 21 and gcc-14 emit no `-Wstrict-prototypes` warning in C23 modes and `reset(1,2)` is a hard error ("expected 0, have 2"); warning only fires in c17 mode; Why false on `baseline: latest`; both rc=0 |
| c-lint-suppression-scope | **rejected** | validator `fm-parse` error: `url:` under `sources:` indented 2 spaces (needs 4); body verified (CERT push/pop; probe: file-wide suppresses later warning, push/pop does not); both rc=0 |
| c-lint-valgrind | verified | Quick Start: Memcheck detects memory errors and leaks with stack traces, reports uninitialised values, leak categories; both rc=0 |

## Counts

- Verified: **20/24** (11 `ffi`, 9 `lint`)
- Rejected: **4/24** (`c-ffi-wchar-format`, `c-lint-gcc-analyzer`, `c-lint-strict-prototypes`, `c-lint-suppression-scope`)
- Blockers: (1) `c-ffi-wchar-format` - replace the citation with a source that states wchar_t's implementation-defined width/encoding (cppreference `types/limits` or ISO C 7.19); (2) `c-lint-gcc-analyzer` - enable `-Wanalyzer-too-complex` explicitly and state that, or drop the "silence is distinguishable" claim; (3) `c-lint-strict-prototypes` - retarget to pre-C23 or rewrite the Why for C23 semantics; (4) `c-lint-suppression-scope` - indent the `url:` line four spaces so the frontmatter parses.
- Non-blocking notes: analyzer-rule distinctness and the compile-commands adjacency assessed above; `access` avoidance confirmed correct for clang; minor citation/wording notes on `time-format`, `valgrind`, and `cppcheck` as listed.
- Pack bookkeeping: the C `INDEX.md` header still reads `Rules: 242 (verified: 194)`; after this batch the pack actually holds 214 verified of 242. The owner should refresh that count (the verifier does not edit INDEX per ownership).

Only the 20 passing `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.

---

# Addendum - Re-verification of the four rejects (2026-10-05)

All four rejected rules were fixed by the author and re-checked from scratch (same toolchain: Apple clang 21.0.0, `clang -fsyntax-only -std=c23 -Wall`; Homebrew GCC 14.2.0; clang-tidy LLVM 20.1.2; cppcheck 2.22.0; validator `--lang c --no-compile`). `status: draft` was kept until this re-verification passed.

## c-ffi-wchar-format (now verified)

- **Fix**: source is now cppreference "Numeric limits (WCHAR_MIN, WCHAR_MAX)" (`/w/c/types/limits`); the Why is scoped to the implementation-defined range.
- **Source**: the cited page lists `WCHAR_WIDTH` ("bit width of `wchar_t`") and `WCHAR_MIN`/`WCHAR_MAX`, and states "Each of the `*_WIDTH` macros ... expands to an implementation-defined value" (`WCHAR_WIDTH` is in the "at least 8" group). The claim "range is implementation-defined" is now directly supported; the 16/32 illustration matches the probe (4 bytes/signed on this host, 2 bytes/unsigned for `--target=x86_64-pc-windows-msvc`).
- **Compile**: both snippets rc=0, zero diagnostics.
- **Note (non-blocking)**: "the limits header provides `WCHAR_MIN` and `WCHAR_MAX`" is loose - the page defines them in `<wchar.h>` and `<stdint.h>` (C99), not `<limits.h>`.

## c-lint-gcc-analyzer (now verified)

- **Fix**: the Why now states the analyzer stops silently by default and that `-Wanalyzer-too-complex` must be enabled explicitly to distinguish silence from truncation.
- **Source/recheck**: GCC Static Analyzer Options - "By default, the analysis silently stops ... The -Wanalyzer-too-complex option warns if this occurs"; `gcc-14 -fanalyzer -Q --help=warnings` shows `-Wanalyzer-too-complex [disabled]`. Probe: Bad snippet under `gcc-14 -fanalyzer -c` reports "double-'free' of 'p' [CWE-415] [-Wanalyzer-double-free]"; Good clean.
- **Compile**: both snippets rc=0, zero diagnostics.

## c-lint-strict-prototypes (now verified)

- **Fix**: retitled "Write void for parameterless function declarations", severity `prefer`; summary and Why rewritten around C23 semantics ("`()` already means no parameters").
- **Recheck**: clang 21 `-std=c23 -Wstrict-prototypes` on `int reset();` emits no diagnostics; `reset(1, 2)` under C23 is a hard error ("too many arguments to function call, expected 0, have 2"); `-std=c17 -Wstrict-prototypes` still warns. The reframed Why matches the probes, and the rule no longer claims a linter enforces it (`enforce: review`, `prefer`).
- **Compile**: both snippets rc=0, zero diagnostics.

## c-lint-suppression-scope (now verified)

- **Fix**: the `url:` line under `sources:` is indented four spaces; `js-yaml` parses the frontmatter (`status=draft`, `severity=should`, one source) and the validator `fm-parse` error is gone.
- **Recheck**: validator `--lang c --no-compile --json` - batch 0 errors, 0 warnings. Probe: file-wide `#pragma clang diagnostic ignored` suppresses a later function's `-Wconversion` finding; `push`/`ignored`/`pop` leaves it ("implicit conversion loses integer precision ... [-Wshorten-64-to-32]").
- **Compile**: both snippets rc=0, zero diagnostics.

## Addendum verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-ffi-wchar-format | verified | cppreference Numeric limits: `WCHAR_WIDTH` implementation-defined, `WCHAR_MIN`/`WCHAR_MAX` documented; probe 4/signed vs 2/unsigned; both rc=0 |
| c-lint-gcc-analyzer | verified | Why now matches the docs' default ("silently stops") + `[disabled]` probe; double-free trace fires on Bad; both rc=0 |
| c-lint-strict-prototypes | verified | C23 probes (no warning; call with args hard error) match the reframed Why; c17 warning confirms the historical note; both rc=0 |
| c-lint-suppression-scope | verified | frontmatter parses (js-yaml + validator 0 errors/0 warnings); scope probe confirms file-wide vs push/pop; both rc=0 |

## Final counts

- Batch 9 verified: **24/24** (12 `ffi`, 12 `lint`); rejected: **0/24**.
- Blockers: none. Non-blocking notes from the main report remain, plus the `WCHAR_MIN`/`WCHAR_MAX` header phrasing note above.
- Pack bookkeeping: after this pass the C pack holds 239 verified of 265 rule files; `INDEX.md`'s header count (265, verified: 214) lags the actual number (owner update; verifier does not edit INDEX per ownership).

In this pass only the four `status:` fields and this addendum were changed; no rule bodies were touched by the verifier, and no git operations were performed.
