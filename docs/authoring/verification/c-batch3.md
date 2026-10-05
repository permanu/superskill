# Verification Report - C Batch 3 (`io`, `unsafe`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 13 `io-*.md` + 16 `unsafe-*.md` (29 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; `pdftotext` (poppler) for WG14 drafts; deterministic validator `node dist/rules/cli.js validate --lang c [--no-compile] --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/c-batch3` (fetched pages, extracted snippets, harnesses)

## Method

1. Fetched all 28 distinct cited URLs with `curl` (all HTTP 200): 15 cppreference pages, 12 CERT C pages (ERR33/FIO30/FIO37/FIO39/FIO45/INT33/INT34/STR00/STR37/EXP42/ARR37/FLP34), Linux man-pages write(2). Extracted the claim-specific passages quoted below.
2. Downloaded WG14 N3220 and N3096 and extracted them with `pdftotext`; the two standard-level judgment calls (unrelated-pointer comparison; null pointer with zero count) were checked against the draft text directly.
3. Extracted both fenced snippets from each rule (58 snippets) and compiled each with the required command `clang -fsyntax-only -std=c23 -Wall`: 58/58 rc=0, zero diagnostics.
4. Built and ran 23 bounded, offline `main()` harnesses (ASan/UBSan where they sharpen the claim) covering every runtime claim in the batch, plus a fclose flush-failure probe.
5. Ran the deterministic validator on the C pack; mechanically re-checked frontmatter, section order, one `c` fence per Bad/Good, summary word count, Why sentence count, keyword count, snippet line caps, banned tokens, `related`/See Also/INDEX link resolution, and near-duplicates.
6. Flip policy: only the 24 rules passing every check were flipped to `status: verified`; the 5 rejects were left `draft`.

## WG14 note

- N3220 (final C23 draft) 6.5.8p6: "In all other cases, the behavior is **undefined**." Relational comparison of pointers to unrelated objects is UB, not "unspecified" - this decides `unsafe-pointer-compare`.
- N3220 7.24.1p3: "Where an argument declared as size_t n specifies the length of the array ... n can have the value zero ... pointer arguments on such a call shall still have valid values, as described in 7.1.4." A null pointer is not valid even when n is zero - this confirms the "even for zero bytes" half of `unsafe-null-memargs`.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 58/58 snippets exit 0 with no diagnostics (29 rules). The validator's own compile pass agrees (no compile diagnostics; `warnings: []`).

## Source evidence (claim-specific)

- **fscanf**: "%s and %[ may lead to buffer overflow if the width is not provided"; "the argument array must have room for at least width+1 characters" (`io-scanf-width`).
- **setvbuf**: "may only be used after stream has been associated with an open file, but before any other operation"; "The stream must be closed (with fclose) before the lifetime of the characters in [buffer, buffer+size) ends" (`io-setvbuf-first`).
- **fprintf/snprintf**: "At most bufsz - 1 characters are written. The resulting character string will be terminated with a null character"; return is "the number of characters ... which would have been written ... or a negative value if an encoding error ... occurred" (`io-snprintf-truncation`).
- **fread**: return "may be less than count if an error or end-of-file condition occurs"; "fread does not distinguish between end-of-file and error, and callers must use feof and ferror" (`io-fread-loop`).
- **fopen**: binary flag "disables special handling of '\n' and '\x1A'" on Windows (`io-binary-mode`); FIO45-C noncompliant double-`fopen` example and `"wx"` compliant solution (`io-exclusive-create`).
- **clearerr**: "Resets the error flags and the EOF indicator" - the page does not state that a retry fails without it (basis for the `io-clearerr-retry` reject).
- **fclose**: "Any unwritten buffered data are flushed to the OS"; ERR33-C lists fclose's error return (`io-fclose-check`).
- **ERR33-C**: exact noncompliant `fseek(...); return fread(...)` example with "the subsequent read will fill the buffer with the wrong contents" (`io-fseek-check`); fclose/fflush error returns.
- **FIO39-C**: quotes the update-stream restriction and undefined behavior 156 (`io-no-alternating-io`).
- **FIO30-C**: tainted format string can "crash a vulnerable process, view the contents of the stack, view memory content, or write to an arbitrary memory location" (`io-format-string-literal`).
- **FIO37-C**: `strlen(buf) - 1` "wraps around to a large positive value, and a write-outside-array-bounds"; `fgets` may return an empty string (`io-fgets-newline`).
- **write(2)**: "EPIPE fd is connected to a pipe or socket whose reading end is closed. When this happens the writing process will also receive a SIGPIPE signal. (Thus, the write return value is seen only if the program catches, blocks or ignores this signal.)" (`io-epipe`).
- **INT34-C / INT33-C**: shift count negative or >= promoted operand width = UB; zero divisor for `/` and `%` = UB (`unsafe-shift-range`, `unsafe-divide-zero`).
- **STR00-C**: plain `char` is for character data "where signedness has little meaning"; `unsigned char` for byte-level access; `isspace('\200')` UB when char is signed (`unsafe-char-signedness`).
- **STR37-C**: ctype argument "shall be representable as an unsigned char or shall equal the value of the macro EOF"; otherwise undefined (`unsafe-ctype-domain`).
- **EXP42-C**: padding values unspecified, byte-wise struct comparison "can lead to incorrect results"; memcmp noncompliant example (`unsafe-padding-compare`).
- **ARR37-C**: pointer arithmetic only on array elements; the struct-of-shorts noncompliant example (`unsafe-null-arith`).
- **FLP34-C**: conversion UB "if the integral part ... cannot be represented"; compliant solution tests `isnan` and range (`unsafe-float-int-cast`).
- **cppreference memcpy**: "undefined if access occurs beyond the end of the dest array"; "undefined if either dest or src is an invalid or null pointer" with no length carve-out (`unsafe-copy-bounds`, `unsafe-null-memargs`).
- **cppreference union**: reinterpretation semantics "since C99"; "Before C99 TC3 (DR 283) this behavior was undefined, but commonly implemented this way"; larger-type excess bytes unspecified and may be a trap representation (basis for the `unsafe-union-active` reject).
- **cppreference va_arg**: UB unless the requested type is compatible with the promoted argument, with only the signed/unsigned and `char*`/`void*` exceptions (`unsafe-va-arg`).
- **cppreference eval_order**: "If a side effect on a scalar object is unsequenced relative to another side effect on the same scalar object, the behavior is undefined" (`unsafe-eval-order`).
- **cppreference bit-field**: allocation order, straddling and plain-`int` signedness are implementation-defined (`unsafe-bitfield-layout`).
- **cppreference assert**: "If NDEBUG is defined ... then assert does nothing" (`unsafe-assert-side-effects`).
- **cppreference pointer**: comparison operators "defined ... in some situations"; "Many implementations also provide strict total ordering of pointers of random origin" - it never calls the unrelated case unspecified (`unsafe-pointer-compare` reject).
- **cppreference setjmp**: non-volatile locals "whose values are indeterminate if they have been changed since the setjmp invocation" (`unsafe-setjmp-volatile`).

## Behavior harness results (ASan/UBSan noted)

- io-fread-loop: pipe with 10 bytes for a 20-byte request - single `fread` returned 10 with the tail untouched; loop rc=0 with `feof` set.
- io-fgets-newline: NUL-first input - Bad = ASan `stack-buffer-underflow` WRITE at `buf[strlen(buf)-1]`; Good len=0; "hello\n" stripped to "hello".
- io-snprintf-truncation: cap 8, value 12345678 - `snprintf` returned 14, buffer null-terminated; Good returned -1 for the small cap and 0 for the big one.
- io-scanf-width: 40-char word into `char[8]` - ASan `stack-buffer-overflow` (WRITE of size 37); Good `%31s` read 31 chars + NUL.
- io-fseek-check: `fseek(-5, SEEK_SET)` returned -1; Bad read the wrong region ("ABCD"); Good returned 0 without reading; valid seek read "CDEF".
- io-exclusive-create: first `"wx"` create ok, second NULL with errno=EEXIST (17), first content preserved.
- io-setvbuf-first: setvbuf-before-I/O rc=0; note macOS returns 0 even when called after I/O (silent no-op), so the Bad misuse is not detectable at runtime here - the standard contract still backs the rule.
- io-clearerr-retry (**reject evidence**): transient-error stream via `funopen` - first `fread` 0/`ferror`=1; retry **without** `clearerr` returned 4 bytes "HELL" with `ferror` still 1. The exact Bad snippet returned rc=0, contradicting its comment "still fails: the error indicator is still set". The EOF flag does short-circuit (retry 0; after `clearerr` 3) - only that half of the Why holds.
- io-fclose-check: buffered `fprintf` to a broken pipe returned 23; `fclose` returned -1/errno=EPIPE - the final flush surfaced the error.
- io-epipe: default disposition killed the child with signal 13 (SIGPIPE); with SIGPIPE ignored `write` = -1/errno=EPIPE(32); Bad `notify` = -1, Good = 0.
- unsafe-shift-range: UBSan "shift exponent 32 is too large for 32-bit type"; Good returns 0 for -1/32 and 0x80000000 for 31.
- unsafe-divide-zero: UBSan "division by zero" on Bad; Good n=0 returns -1 and leaves the out-param untouched.
- unsafe-null-memargs: UBSan and ASan are silent for `memcpy/memset(NULL, ..., 0)` on this SDK (not required to catch UB); the cited page and N3220 7.24.1p3 state the rule.
- unsafe-char-signedness: char is signed here; Bad(0xFF) = -1, Good = 255.
- unsafe-ctype-domain: `isalpha(-23)` returns 0 on macOS (libc tolerates it); Bad and Good both count 1 for {0xE9,'A'} - UB not observable here, STR37-C states it.
- unsafe-va-arg: Bad reading `double` from an `int` argument returned 0; Good returned 42 (same at -O0/-O2).
- unsafe-setjmp-volatile: at -O2 Bad returned 0 (stale), Good 1; both 1 at -O0.
- unsafe-float-int-cast: UBSan "nan is outside the range of representable values of type 'int'" on Bad; Good returns -1 for NaN/Inf/1e300, 50 for 0.5, and 2147483647 for INT_MAX/100.0.
- unsafe-pointer-compare: Bad compared two separate allocations (returned 1 here - implementation total ordering); Good index comparison correct. The Why's "unspecified" term is the problem, not the decision.
- unsafe-union-active: Bad and Good both produced 1.0f for 0x3f800000 on this little-endian target - same-size punning is the defined case per the cited page.
- unsafe-bitfield-layout: memory-read encoding 0xab equals explicit encoding 0xab on this target (layout portability claim, not an observable difference here).
- unsafe-assert-side-effects: under `-DNDEBUG` Bad left count 3 (decrement lost), Good 2; without it both 2.
- unsafe-padding-compare: same field values but different padding bytes - fields_equal=1, memcmp_equal=0.
- unsafe-eval-order: Bad `(a[i] = 1) + (a[i] = 2)` returned 3 at -O0 and -O2, UBSan silent - optimizer-dependent UB, source backs the claim.
- unsafe-null-arith: Bad struct walk summed 6 on this target (members contiguous); UB by ARR37-C, not observable here.

## `io-epipe` scoping assessment

The rule uses POSIX `write(2)`/`errno`/`EPIPE`/`SIGPIPE`, and its only source is the Linux man-pages write(2). Every claim in the Why is stated there verbatim in substance (EPIPE on closed reader, SIGPIPE raised, return value seen only if the signal is caught/blocked/ignored). The C pack already carries POSIX-flavored rules (`err-eintr-retry` cites read(2), `err-errno-capture` cites POSIX), so the scope is consistent with the pack. Non-blocking note: the Good snippet handles EPIPE but does not set the SIGPIPE disposition itself (process-wide setup); the Why tells the reader to decide it deliberately.

## Formatting, validator, duplicates, links

- All 29: id/path match, `lang: c`, `baseline: latest`, valid severity/enforce values, section order exact, exactly one `c` fence per Bad/Good, summaries <= 30 words, Why 2-5 sentences, keywords 2-8, snippets <= 25 lines, no banned tokens/elisions/hedges; all `related` ids and See Also links resolve.
- No duplicate or near-duplicate pair among the 29 or against the rest of the C pack (max title+summary similarity below threshold; closest pairs are distinct decisions).
- `INDEX.md` lists all 29 files (13 io + 16 unsafe) and the directory matches. It currently reads `Rules: 98 (verified: 37)`; after this batch it should read `verified: 61` (owner update; not touched by this verifier).
- Deterministic validator in-scope errors are exactly the two rejected formatting cases below. The `sec-file-mode` error and the `doc-*`/`proj-*` `index-missing` errors are other batches, outside this scope.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-io-binary-mode | verified | cppreference fopen "b" disables `'\n'`/`'\x1A'` special handling; both rc=0; portability decision, no POSIX runtime claim |
| c-io-clearerr-retry | **rejected** | Why "always fails the retry" is false for the error indicator: funopen transient-error harness - retry without clearerr returned 4 bytes "HELL" (ferror stayed 1); the exact Bad snippet returns 0, not the commented -1. Only the EOF flag short-circuits. Rephrase (stale ferror misreporting) and re-verify |
| c-io-epipe | verified | write(2) EPIPE+SIGPIPE text; run: default kill sig 13, ignored -> -1/EPIPE(32), Bad -1 vs Good 0; POSIX scope consistent with pack (see assessment) |
| c-io-exclusive-create | verified | FIO45-C noncompliant double-fopen + `"wx"`/`O_CREAT|O_EXCL` solutions; run: second create NULL/EEXIST, content preserved |
| c-io-fclose-check | verified | cppreference fclose flush text + ERR33-C fclose row; run: fclose -1/EPIPE after buffered fprintf rc=23 |
| c-io-fgets-newline | verified | FIO37-C `strlen-1` wrap text; ASan stack-buffer-underflow on Bad with NUL-first input; Good len=0 / strips newline |
| c-io-format-string-literal | **rejected** | Frontmatter does not parse: unquoted `%n` in `keywords` flow sequence (validator `fm-parse`; Ruby Psych "found character that cannot start any token at line 11 column 48"). Quote `"%n"` and re-verify; body/source (FIO30-C) are fine |
| c-io-fread-loop | verified | cppreference fread short-read + feof/ferror text; run: 20-byte request got 10, tail untouched, loop rc=0/feof |
| c-io-fseek-check | verified | ERR33-C fseek noncompliant example; run: fseek(-5)=-1, Bad read wrong region, Good returned 0 |
| c-io-no-alternating-io | verified | FIO39-C restriction text (UB 156); both rc=0; UB not run (optimizer-dependent), source backs it |
| c-io-scanf-width | verified | cppreference fscanf overflow warning + width+1 room; ASan stack-buffer-overflow on Bad; Good read 31 chars |
| c-io-setvbuf-first | verified | cppreference setvbuf "before any other operation" + buffer lifetime; setvbuf-before-I/O rc=0 (macOS also returns 0 after I/O - silent, non-blocking note) |
| c-io-snprintf-truncation | verified | cppreference "At most bufsz-1 ... null terminated" + would-be-length return; run: ret 14/cap 8 truncated, Good -1 |
| c-unsafe-assert-side-effects | verified | cppreference assert "does nothing" under NDEBUG; run -DNDEBUG: Bad count 3 vs Good 2 |
| c-unsafe-bitfield-layout | verified | cppreference bit-field implementation-defined order/straddling/signedness; run encodings equal on this target (portability claim) |
| c-unsafe-char-signedness | verified | STR00-C plain-char/unsigned-char philosophy; run: Bad(0xFF)=-1, Good=255 |
| c-unsafe-copy-bounds | verified | cppreference memcpy "undefined if access occurs beyond the end of the dest array"; ASan heap-buffer-overflow on Bad, Good -1 |
| c-unsafe-ctype-domain | verified | STR37-C "EOF or representable as an unsigned char; otherwise ... undefined"; runtime tolerant on macOS (UB not observable), source states it |
| c-unsafe-divide-zero | verified | INT33-C zero-divisor UB; UBSan "division by zero"; Good n=0 -> -1, out untouched |
| c-unsafe-eval-order | verified | cppreference eval_order unsequenced-side-effects UB (exact class); Bad ran 3 at -O0/-O2, UBSan silent - source backs it |
| c-unsafe-float-int-cast | verified | FLP34-C out-of-range conversion UB + isnan/range compliant solution; UBSan float-cast-overflow on Bad; Good correct on NaN/Inf/1e300/0.5 |
| c-unsafe-null-arith | **rejected** | `triggers.keywords: [pointer arithmetic, array, non-array, null]` - unquoted `null` parses as YAML null (validator `field-type`). Quote `"null"` and re-verify; body/source (ARR37-C) are fine |
| c-unsafe-null-memargs | verified | cppreference memcpy null UB (no length carve-out) + N3220 7.24.1p3 "n can have the value zero ... shall still have valid values"; sanitizers silent here (not required to catch); Good skips the call |
| c-unsafe-padding-compare | verified | EXP42-C padding unspecified + memcmp noncompliant example; run: fields_equal=1, memcmp_equal=0 |
| c-unsafe-pointer-compare | **rejected** | Why says unrelated-pointer ordering is "unspecified"; N3220/N3096 6.5.8p6 says "the behavior is undefined", and the cited cppreference pointer page never says unspecified (defined in some situations; many implementations provide total ordering). Reword to UB (or cite a source that states the status) and re-verify |
| c-unsafe-setjmp-volatile | verified | cppreference setjmp indeterminate-non-volatile-locals text; run -O2: Bad 0 vs Good 1 |
| c-unsafe-shift-range | verified | INT34-C negative/>=width UB; UBSan "shift exponent 32 is too large"; Good rejects -1/32 |
| c-unsafe-union-active | **rejected** | Why calls punning "a common extension rather than a portable guarantee"; the cited cppreference union page presents reinterpretation as the behavior since C99 TC3 ("Before C99 TC3 ... undefined, but commonly implemented this way"), and the Bad is the same-size case where the source gives defined semantics. Rephrase to the excess-bytes/trap-representation/layout caveat and re-verify |
| c-unsafe-va-arg | verified | cppreference va_arg promoted-type compatibility + exceptions; run: Bad (double from int) 0 vs Good 42 |

## Counts

- Verified: 24/29 (11 io, 13 unsafe)
- Rejected: 5/29 (2 io, 3 unsafe)
- Blockers: `io-format-string-literal` (quote `"%n"`), `unsafe-null-arith` (quote `"null"`), `io-clearerr-retry` (align Why/Bad with actual indicator behavior), `unsafe-union-active` (rephrase the "extension" claim to match the cited page), `unsafe-pointer-compare` (change "unspecified" to undefined behavior).
- Non-blocking notes: `io-epipe`'s Good handles EPIPE but not the process-wide SIGPIPE disposition; macOS `setvbuf` returns 0 after I/O so the misuse is silent there; `unsafe-ctype-domain`'s "negative range for table indexing" sentence is unsourced but consistent with common ctype tables; `unsafe-eval-order` and `unsafe-null-arith` UB is not observable on this toolchain; `unsafe-null-memargs` sanitizers are silent on this SDK.

Only the 24 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched.

---

# Addendum - five fixes re-verified (2026-10-05)

The five rejected rules were fixed by the owner (all re-entered as `status: draft`) and re-checked independently.

| rule id | verdict | evidence |
|---|---|---|
| c-io-clearerr-retry | **verified** | Why rewritten to the sticky-indicator truth (error retry can succeed; EOF flag short-circuits). New exact-snippet harness: Bad rc=-1 with `feof` still set after more data arrives; Good rc=0 and reads `def` after `clearerr`. Both snippets compile clean; YAML/formatting/links clean |
| c-io-format-string-literal | **verified** | `"%n"` quoted; frontmatter now parses (validator `fm-parse` gone; Ruby Psych OK); snippets compile clean; body/source unchanged from the original pass (FIO30-C) |
| c-unsafe-union-active | **verified** | Why now matches the cited cppreference page: reinterpretation is defined; the value depends on byte order, padding and the new type's representation; larger-type excess bytes are unspecified and may be a trap representation; `memcpy` is framed as the explicit, layout-independent alternative. Snippets compile clean |
| c-unsafe-pointer-compare | **verified** | "unspecified" corrected to "undefined" in the Why and the Bad comment, matching N3220/N3096 6.5.8p6. Snippets compile clean. Non-blocking: `triggers.keywords` still lists `unspecified` as a retrieval synonym; change it to `undefined behavior` at the next edit |
| c-unsafe-null-arith | **verified** | `"null"` quoted; frontmatter now parses (validator `field-type` gone); body/source unchanged from the original pass (ARR37-C) |

Re-checks: 10/10 fixed snippets compile with `clang -fsyntax-only -std=c23 -Wall` (zero diagnostics); the deterministic validator reports zero in-scope errors and zero warnings; mechanical formatting and `related`/See Also link checks are clean; no new near-duplicates.

## Final counts

- Verified: 29/29 (13 io, 16 unsafe) - all of C batch 3
- Rejected: 0
- `INDEX.md` currently reads `Rules: 122 (verified: 67)` with batch 3 at "(24 verified)"; after this addendum it should read `verified: 72` and batch 3 as fully verified (owner update; not touched by this verifier).
