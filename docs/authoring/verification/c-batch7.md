# Verification Report - C Batch 7 (`style` + `num`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `style-*.md` + 12 `num-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; deterministic validator `node dist/rules/cli.js validate --lang c --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/cbatch7` (fetched pages, extracted snippets, behavior harnesses)

## Method

1. Fetched every cited URL (kernel coding style; CERT INT32-C, INT33-C, FLP30-C, FLP32-C, FLP37-C; cppreference arithmetic operators, abs, isnan, numeric limits, floating constant, Boolean type, C23) and confirmed each claim against the page text quoted below.
2. Extracted both fenced snippets from each rule (48 snippets) and compiled each with the advertised command `clang -fsyntax-only -std=c23 -Wall`: 48/48 exit 0 with zero diagnostics. `num-float-model`'s `#ifdef`/`#else` branches were forced separately (`#if 1` / `#if 0`): both clean.
3. Built and ran bounded, offline harnesses for every runtime claim: signed overflow, `INT_MIN / -1`, truncation and floor adjustment, float loop counters (both CERT examples), math domain/pole errors with `errno`/`isnan`, `abs(INT_MIN)`, NaN comparisons, the float model macro, print round-trip, object-representation comparison, byte masking, and float literal typing. UB cases ran under `-fsanitize=undefined -fno-sanitize-recover=undefined`.
4. Ran the deterministic validator and mechanically re-checked frontmatter types, section order, one `c` fence per Bad/Good, summary word counts, snippet line caps, banned tokens/elisions, `related`/See Also/INDEX links, and near-duplicates (summary Jaccard scan plus manual reads of the closest siblings).
5. Flip policy: only rules passing every check were flipped to `status: verified`; the three rejects were left `draft`.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 48/48 snippets exit 0 with no diagnostics. No rule uses `compile_exempt`. On this host `__STDC_IEC_60559_BFP__` is **not** defined by clang under `-std=c23` (nor `-std=gnu23`/`-std=c2x`; `__STDC_IEC_559__` is also absent), so `num-float-model`'s Good compiles the `#else` path here; forcing the `INFINITY` path also compiles clean.

## Source evidence (claim-specific)

- **Kernel coding style** (`style-*`, all 12): "separate functions with one blank line" (6); "bool values can only evaluate to 0 or 1 ... true and false ... instead of 1 and 0" and "bool function return types and stack variables are always fine" (17, `style-bool`); "opening brace last on the line ... functions ... opening brace at the beginning of the next line" and closing brace "empty on a line of its own" except `do`/`else` continuations (3, `style-brace-placement`); "use braces in both branches" when one branch is multi-statement (3, `style-braces-both-branches`); the preferred multi-line comment block verbatim (8); "Names of macros defining constants and labels in enums are capitalized" (12); space after `if, switch, case, for, do, while`, none with `sizeof, typeof, alignof` (3.1); "preferred limit ... 80 columns", sensible chunks, "align descendants to a function open parenthesis", "never break user-visible strings" (2); mixed-case names "frowned upon" (4); "Don't put multiple statements on a single line ... multiple assignments" (1); `*` "adjacent to the data name or function name and not adjacent to the type name" (3.1); "align the switch and its subordinate case labels in the same column" (1, `style-switch-align`).
- **cppreference Boolean type**: `<stdbool.h>` exposes `bool` as `_Bool`, `true` as 1, `false` as 0 (`style-bool`).
- **INT32-C**: signed overflow is undefined; addition compliant solution is the exact operand test in the Good (`num-signed-overflow`).
- **cppreference arithmetic operators**: "When signed integer arithmetic operation overflows ... the behavior is undefined"; "If the quotient `a/b` is not representable in the result type, the behavior of both `a/b` and `a%b` is undefined (that means `INT_MIN%-1` is undefined on 2's complement systems)"; integer `/` is "truncated towards zero (since C99)" and `%` satisfies `(a/b)*b + a%b == a` (`num-int-min-division`, `num-integer-truncation`, `num-signed-overflow`).
- **INT33-C**: division/remainder overflow occurs "when the dividend is equal to the minimum (most negative) value ... and the divisor is equal to −1"; its compliant solution checks `(s_b == 0) || ((s_a == LONG_MIN) && (s_b == -1))` (`num-int-min-division`).
- **cppreference abs**: "The behavior is undefined if the result cannot be represented by the return type"; Notes: "INT_MIN is -2147483648, but the would-be result 2147483648 is greater than INT_MAX" (`num-abs-int-min`).
- **FLP30-C**: 0.1 "is a repeating fraction in binary"; the loop "may iterate 9 or 10 times"; compliant solution uses an integer induction variable; an increment too small to change the counter "may not terminate" (`num-float-loop-counter`).
- **FLP32-C**: definitions of domain/pole/range errors; `sqrt(-1.0)` is a domain error, `log(0.0)` a pole error returning negative infinity; "an implementation may set errno but is not required to"; errno use is determined by `math_errhandling & MATH_ERRNO` (`num-math-errors`).
- **FLP37-C**: `-0.0` and `0.0` compare equal with different bit patterns; two same-pattern NaNs do not compare equal; compare members, not `memcmp` (`num-float-representation-compare`).
- **cppreference isnan**: "NaN values never compare equal to themselves or to other NaN values"; `x != x` is the fallback test (`num-nan-compare`).
- **cppreference numeric limits**: `CHAR_BIT` is the implementation-defined "bit width of byte", at least 8 (`num-char-bit`); `DBL_DECIMAL_DIG` conversion to decimal and back "is the identity conversion: this is the decimal precision required to serialize/deserialize" (`num-float-print-roundtrip`).
- **cppreference floating constant**: "An unsuffixed floating constant has type double. If suffix is the letter f or F, the floating constant has type float" (`num-float-literals`).
- **cppreference C23**: `__STDC_IEC_60559_BFP__` "Indicates IEEE-754 binary floating-point arithmetic and required math functions are supported"; `INFINITY`/`NAN` move to `<float.h>` (deprecated in `<math.h>`) (`num-float-model`).
- **cppreference INFINITY** (secondary check): C23 "Otherwise, the macro INFINITY is not defined" - the guard direction in `num-float-model` is sound.

## Behavior harness results

- `num-signed-overflow`: Good returns -1 for `(INT_MAX, 1)`, 0/3 for `(1, 2)`; UBSan: `signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'`.
- `num-int-min-division`: Good returns -1 for `INT_MIN`, 0/-7 for 7; UBSan: `division of -2147483648 by -1 cannot be represented in type 'int'`.
- `num-abs-int-min`: Good returns -1 for `INT_MIN`, 0/5 for -5; UBSan: `negation of -2147483648 cannot be represented in type 'int'`.
- `num-integer-truncation`: `-3/2 == -1`, `-3%2 == -1`, `half_floor(-3) == -2`, `half_floor(3) == 1`, `half_floor(-4) == -2`; `(a/b)*b + a%b == a` holds for ±7 and ±13.
- `num-float-loop-counter`: bounded `x != 1.0` loop ran 1000 iterations without ever hitting exactly 1.0; after ten `+= 0.1` steps `x == 0.99999999999999989` (`x == 1.0` false); CERT's `x <= 1.0f` loop ran 9 iterations (CERT: "9 or 10"); `100000001.0f + 1.0f` does not advance the value (non-terminating case); the integer-counter loop ran exactly 10.
- `num-math-errors`: on this platform `math_errhandling & MATH_ERRNO == 0`, `sqrt(-1.0) = nan` with `errno != EDOM`, `log(0.0) = -inf`; the Good (`errno = 0; r = sqrt(x); if (errno == EDOM || isnan(r)) return -1;`) returns -1 for -1.0 and 0/2.0 for 4.0 - the `isnan` arm is what makes detection work where errno is not used.
- `num-nan-compare`: `NaN == NaN`, `NaN < 0`, `NaN >= 0` all 0; `!(NaN < 0.0)` is 1; **Bad and Good return the same 0 for `in_range(NaN)`** (see reject detail).
- `num-float-model`: macro not defined by this clang; `INFINITY`/`NAN` still available and `isnan(NAN)` true; both Good branches compile clean when forced.
- `num-float-print-roundtrip`: `DBL_DECIMAL_DIG == 17`; `%.2f` of 1/3 gives `0.33` (round-trip fails), `%.*g` gives `0.33333333333333331` (round-trip succeeds).
- `num-float-representation-compare`: `0.0 == -0.0` true but `memcmp != 0`; identical NaN bit patterns give `memcmp == 0` while `==` is false; the Good's member comparison returns true/false correctly.
- `num-char-bit`: on this host `CHAR_BIT == 8`, `(1u << CHAR_BIT) - 1 == 255 == UCHAR_MAX`, `low_byte(0x1234) == 0x34`; the portability failure is on other targets (see reject detail).
- `num-float-literals`: `_Generic` shows 1.5 is `double` and 1.5f is `float`; `sizeof(v * 1.5) == 8`, `sizeof(v * 1.5f) == 4`.

## Reject detail

**`c-style-bool` (rejected)** - The deterministic validator reports two `field-type` errors: `"triggers.keywords" must be an array of non-empty strings` and `"triggers.symbols" must be an array of non-empty strings`. Cause: the bare YAML scalars `true`/`false` in `keywords: [bool, boolean, stdbool, true, false]` and `symbols: [bool, true, false]` parse as booleans (`js-yaml` gives `["bool","boolean","stdbool",true,false]`), which is exactly the "unquoted YAML type trap" CONTRACT section 12 bans. Fix: quote them (`"true"`, `"false"`). The body is otherwise sound: kernel section 17 and cppreference Boolean type support the Why, and both snippets compile clean.

**`c-num-char-bit` (rejected)** - The Why claims the Good "stays correct wherever a byte has another width", but `(1u << CHAR_BIT) - 1` is undefined behavior whenever the shift count is at least the width of the promoted operand (cppreference arithmetic operators: "undefined if rhs ... is greater or equal the number of bits in the promoted lhs"). That is the case on a real, conforming non-8-bit-byte target class: TI TMS320C28x has `CHAR_BIT == 16` with a 16-bit `unsigned int` (TI documentation: "the TMS320C28x char is 16 bits ... a byte is also 16 bits", `sizeof(int) == 1`), so `1u << 16` is UB - on precisely the platforms the rule exists for. UBSan confirms the UB class on this host with a shift count equal to the width (`shift exponent 32 is too large for 32-bit type 'unsigned int'`). The portable fix that preserves the stated intent ("one byte, whatever its width") is `value & UCHAR_MAX`; alternatively guard the shift count. The framing should acknowledge that the mask expression assumes `unsigned int` is wider than a byte.

**`c-num-nan-compare` (rejected)** - Two defects. (1) The summary "every comparison with NaN is false, including equality with itself" is factually wrong for `!=`: `NaN != x` is true, and the body's own fallback `x != x` depends on that (cppreference isnan: "NaN values never compare equal", not "all comparisons are false"). (2) The Bad and Good are behaviorally identical for the predicate shown: the harness returns 0 for `in_range(NaN)` from both, so the pair does not demonstrate a corrected failure. The Why's negation-check example (`!(value < 0.0)` silently accepts NaN) is the case that actually shows the hazard. Fix: reword the summary (e.g., "NaN compares unequal to everything and fails ordering comparisons") and use the negation pattern for the Bad/Good pair.

## Non-blocking notes

- `num-float-model`: the Why's "INFINITY and NAN are only defined where the implementation provides the IEC 60559 binary model, signaled by the feature-test macro" is imprecise - C23 conditionally defines `INFINITY` when an infinity exists ("Otherwise, the macro INFINITY is not defined"), which is not exclusive to the macro (this clang defines neither IEC macro yet provides both values). The guard direction is sound (macro implies the model implies infinities), and the Good's fallback is safe. Also, C23 deprecates `INFINITY` via `<math.h>` (should be `<float.h>`); the snippet still compiles clean. Not blocking.
- `num-math-errors`: the errno + `isnan` combination is confirmed and necessary - on this platform `math_errhandling & MATH_ERRNO == 0`, so errno is not set and `isnan` carries the domain-error detection; where errno is set, the `EDOM` arm catches it. The title/summary mention pole and range errors while the snippet demonstrates a domain error only (`sqrt` has no range/pole errors per FLP32-C's table); CERT's fuller template gates on `math_errhandling` and fenv exceptions. Not blocking.
- Style severities are defensible under CONTRACT section 3: 9 `prefer` (pure taste), 3 `should` (`style-bool`, `style-braces-both-branches`, `style-one-statement-per-line` - idiomatic defaults with a mild bug-avoidance value), none `must`; all `enforce: review`, so no linter-enforcement claim.
- Validator: apart from the two `style-bool` errors, the batch has zero errors and zero warnings (other files' `fm-parse` errors are outside this batch).

## Formatting, validator, duplicates, links

- All 24: id/path match, required frontmatter present, `lang: c`, `baseline: latest`, valid severity/enforce values, exact section order, exactly one `c` fence per Bad/Good, snippets <= 25 lines, summaries <= 30 words, no TODO/elisions/trailing whitespace, all `related` ids and See Also targets resolve, and `INDEX.md` lists all 24 with matching summaries.
- Deterministic validator (`--lang c --json`): 2 errors, both on `style-bool` (above); 0 warnings for the batch.
- Duplicates: no duplicate or near-duplicate pair found. Closest siblings read and confirmed distinct: `num-int-min-division` vs `unsafe-divide-zero` (MIN/-1 overflow vs zero divisor), `num-signed-overflow` vs `err-ckd-arithmetic` (manual operand test vs checked macros), `num-float-print-roundtrip` vs `conv-printf-length` (precision vs length modifier), `num-char-bit` vs `conv-bitwise-unsigned` (byte width vs signedness of operands), `num-nan-compare` vs `num-math-errors`/`unsafe-float-int-cast` (classification vs detection/cast). Summary-overlap scan flagged nothing above 0.5 Jaccard.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-style-blank-line-functions | verified | kernel 6 "separate functions with one blank line"; both rc=0, zero diagnostics |
| c-style-bool | **rejected** | validator `field-type` x2: bare `true`/`false` parse as YAML booleans in triggers (js-yaml: `["bool","boolean","stdbool",true,false]`); body/sources otherwise sound; both rc=0 |
| c-style-brace-placement | verified | kernel 3 K&R: brace last on line for control blocks, next line for functions, closing brace alone; both rc=0 |
| c-style-braces-both-branches | verified | kernel 3 "use braces in both branches" when one side is multi-statement; both rc=0 |
| c-style-comment-blocks | verified | kernel 8 preferred multi-line comment form verbatim; both rc=0 |
| c-style-constants-caps | verified | kernel 12 "Names of macros defining constants and labels in enums are capitalized"; both rc=0 |
| c-style-keyword-spacing | verified | kernel 3.1 space after `if/switch/case/for/do/while`, none with `sizeof/typeof/alignof`; both rc=0 |
| c-style-line-length | verified | kernel 2 80-column preferred limit, sensible breaks, function-parenthesis alignment, never break user-visible strings; both rc=0 |
| c-style-lowercase-names | verified | kernel 4 mixed-case names "frowned upon"; descriptive globals; both rc=0 |
| c-style-one-statement-per-line | verified | kernel 1 no multiple statements or assignments per line; both rc=0 |
| c-style-pointer-star | verified | kernel 3.1 `*` adjacent to the name, not the type; both rc=0 |
| c-style-switch-align | verified | kernel 1 align `switch` and `case` labels in one column; both rc=0 |
| c-num-abs-int-min | verified | cppreference abs UB + INT_MIN note; UBSan "negation of -2147483648 cannot be represented"; Good returns -1; both rc=0 |
| c-num-char-bit | **rejected** | `1u << CHAR_BIT` is UB when shift >= operand width (cppreference); TI C28x `CHAR_BIT=16` + 16-bit `unsigned int` is conforming and makes it UB; Why claims "stays correct wherever"; portable fix `UCHAR_MAX`; both rc=0 on this host |
| c-num-float-literals | verified | cppreference floating constant: unsuffixed `double`, `f` suffix `float`; harness `_Generic`/sizeof 8 vs 4; both rc=0 |
| c-num-float-loop-counter | verified | FLP30-C: 0.1 repeating, 9-or-10 iterations, integer induction, non-terminating too-small step; harness confirms all three; both rc=0 |
| c-num-float-model | verified | cppreference C23: macro indicates IEEE-754 BFP; INFINITY page: C23 undefined otherwise; both branches forced-compile clean; note: "only defined" wording imprecise, clang defines no IEC macro (fallback taken); both rc=0 |
| c-num-float-print-roundtrip | verified | cppreference limits: `DBL_DECIMAL_DIG` identity conversion; harness `%.2f` fails / `%.*g`=17 round-trips 1/3; both rc=0 |
| c-num-float-representation-compare | verified | FLP37-C `-0.0`/`0.0` and NaN cases; harness `memcmp != 0` vs `==` true, `memcmp == 0` vs `==` false; both rc=0 |
| c-num-int-min-division | verified | INT33-C covers MIN/-1; cppreference quotient-not-representable UB; UBSan "division of -2147483648 by -1 cannot be represented"; Good returns -1; both rc=0 |
| c-num-integer-truncation | verified | cppreference truncation toward zero + `(a/b)*b + a%b == a`; harness `-3/2=-1`, `-3%2=-1`, floor adjust correct; both rc=0 |
| c-num-math-errors | verified | FLP32-C domain/pole/range; harness `sqrt(-1)=NaN`, `log(0)=-inf`, `MATH_ERRNO=0` here so `isnan` carries detection; Good root(-1)=-1, root(4)=2; note summary mentions pole/range, snippet shows domain; both rc=0 |
| c-num-nan-compare | **rejected** | summary "every comparison ... is false" wrong for `!=` (NaN != x is true; body's `x != x` fallback depends on it); harness: Bad and Good both return 0 for `in_range(NaN)` - identical behavior, no demonstrated fix; both rc=0 |
| c-num-signed-overflow | verified | INT32-C UB + compliant operand test (matches Good); UBSan "signed integer overflow: 2147483647 + 1 cannot be represented"; Good returns -1; both rc=0 |

## Counts

- Verified: **21/24** (11 `style`, 10 `num`)
- Rejected: **3/24** (`c-style-bool`, `c-num-char-bit`, `c-num-nan-compare`)
- Blockers: (1) `c-style-bool` - quote `"true"`/`"false"` in `triggers.keywords` and `triggers.symbols` so they stay strings; (2) `c-num-char-bit` - replace `(1u << CHAR_BIT) - 1` with `UCHAR_MAX` (or bound the shift) and stop claiming correctness wherever a byte has another width; (3) `c-num-nan-compare` - fix the summary's `!=` claim and demonstrate the negation-check failure.
- Non-blocking notes: `num-float-model`'s "only defined" wording is imprecise (C23 conditionally defines INFINITY when infinity exists; clang defines no IEC macro but provides both values) and its Good includes `INFINITY` via the C23-deprecated `<math.h>` location; `num-math-errors`' summary mentions pole/range while the snippet shows a domain error (the errno+isnan rationale is confirmed).

Only the 21 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.

---

# Addendum - Re-verification of the three rejects (2026-10-05)

All three rejected rules were fixed by the author and re-checked from scratch (same toolchain: Apple clang 21.0.0, `clang -fsyntax-only -std=c23 -Wall`); `status: draft` was kept until this re-verification passed.

## c-style-bool (now verified)

- **Fix**: `triggers.keywords` is now `[bool, boolean, stdbool, "true", "false"]` and `triggers.symbols` `[bool, "true", "false"]`. `js-yaml` now yields all strings (`["bool","boolean","stdbool","true","false"]`; every element `typeof === "string"`), so the CONTRACT section 12 YAML type trap is gone.
- **Validator**: the two `field-type` errors are gone - 0 errors, 0 warnings for this rule (`node dist/rules/cli.js validate --lang c --json`).
- **Body/source/compile**: body unchanged; kernel section 17 ("true and false ... instead of 1 and 0") and cppreference Boolean type still support the Why; both snippets compile clean (rc=0, zero diagnostics).

## c-num-char-bit (now verified)

- **Fix**: retitled "Express byte masks with UCHAR_MAX, not the literal 0xFF"; summary "Mask bytes with UCHAR_MAX instead of assuming a byte is eight bits"; Good is now `value & (unsigned)UCHAR_MAX` (no shift).
- **Framing now acknowledges the hazard**: the Why states `UCHAR_MAX` "avoids shifting by `CHAR_BIT`, which would reach the width of `unsigned` on targets where the byte and the operand are the same size" - exactly the UB case in the original reject (shift count >= promoted operand width; cppreference arithmetic operators; TI C28x `CHAR_BIT=16`/16-bit `unsigned int`). `(unsigned)UCHAR_MAX` uses no shift and is representable on every conforming target, so the remaining claim ("stays correct wherever a byte has another width") holds.
- **Source/compile/behavior**: cppreference numeric limits documents `UCHAR_MAX` as the maximum value of `unsigned char` (one byte); both snippets compile clean (rc=0); harness: `CHAR_BIT=8`, `UCHAR_MAX=255`, `low_byte(0x1234)=0x34`, `(unsigned)UCHAR_MAX=255` (cast is a no-op here and well-defined elsewhere).
- **Note**: `INDEX.md` still carries the old summary "Express byte widths in CHAR_BIT, not the literal 8" for this file; owner should refresh it (verifier does not edit INDEX per ownership).

## c-num-nan-compare (now verified)

- **Fix**: summary is now "Ordered comparisons against NaN are false, so negated checks accept it; test isnan explicitly"; the Why says "every ordered comparison against it is false; only `!=` is true" - the previous false "every comparison ... is false" claim is gone.
- **Bad/Good now demonstrate the failure**: `reject_negative` Bad returns 1 for NaN (the negated check accepts it), Good returns 0 after an explicit `isnan`. Harness: `NaN<0`, `NaN<=0`, `NaN>0`, `NaN>=0`, `NaN==NaN` all 0 and `NaN!=NaN` 1; Bad(NaN)=1, Good(NaN)=0; both agree for -1 (0) and 1 (1) - so the pair shows a corrected, behaviorally different case.
- **Source/compile**: cppreference isnan ("NaN values never compare equal to themselves or to other NaN values"; `x != x` fallback) supports the Why; both snippets compile clean (rc=0).

## Addendum verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-style-bool | verified | quoted `"true"`/`"false"` parse as strings (js-yaml); validator 0 errors/0 warnings; kernel 17 + cppreference Boolean type; both rc=0 |
| c-num-char-bit | verified | `value & (unsigned)UCHAR_MAX` is shift-free and portable; Why now states the shift-width hazard; cppreference limits documents UCHAR_MAX; harness CHAR_BIT=8/UCHAR_MAX=255/low_byte=0x34; both rc=0 |
| c-num-nan-compare | verified | summary/Why precise on ordered comparisons and `!=`; harness Bad(NaN)=1 vs Good(NaN)=0, other inputs agree; cppreference isnan; both rc=0 |

## Final counts

- Batch 7 verified: **24/24** (12 `style`, 12 `num`); rejected: **0/24**.
- Blockers: none. Non-blocking notes from the main report remain (`num-float-model` wording/header note; `num-math-errors` summary broader than its domain example). `INDEX.md` is stale for `num-char-bit`'s title/summary and for the pack verified count (owner update; not touched by this verifier).

The three `status:` fields and this addendum were the only changes; no rule bodies beyond the author's fixes were touched, and no git operations were performed.
