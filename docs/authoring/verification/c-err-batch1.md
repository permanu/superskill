# Verification Report - C `err` Batch 1

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-04
- Scope: `catalog/rules/c/err-*.md` (15 rules; all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-c-err` (urls, snippets, probes, harnesses)

## Method

1. Fetched every cited URL (19 distinct in rule sources, 3 in `sources.md`) with `curl`; all returned HTTP 200. Downloaded the 19 content pages, extracted text, and grepped the claim-specific passages quoted below.
2. Extracted both fenced snippets from each rule (30 files) and compiled each with the required command `clang -fsyntax-only -std=c23 -Wall`: 30/30 rc=0, zero diagnostics.
3. Built and ran a `main()` harness for every runtime claim (errno read/set discipline, errno capture, strerror reuse, `ckd_mul` overflow, out-param commit, sentinel aliasing, `realloc` failure, goto/partial cleanup under ASan + malloc-zone stats, EINTR/short transfer). All harnesses bounded with `alarm`/perl timeouts.
4. Checked idiom against current stable C (C23) and cross-read `related` rules for duplication/contradiction.
5. Mechanical formatting pass: frontmatter fields, id/path match, section order, one `c` fence per Bad/Good, summary word count, Why sentence count, keyword count, snippet line cap, banned tokens, `related`/See Also/INDEX link resolution, near-duplicate scan.

## WG14 PDF note

`webfetch` cannot read `application/pdf`, so the two WG14 drafts were checked with `curl`: N3220, N3301 and N3886 all return HTTP 200. No rule in this batch cites them directly - they appear only in `catalog/rules/c/sources.md` as the pinned baseline/traceability entries. Every standard-level claim in this batch was corroborated from cppreference or CERT C instead: `<stdckdint.h>` macros (ckd-arithmetic), `[[nodiscard]]` (check-return-values), `realloc`/`free` semantics (alloc-failure), and INT30-C's "Compliant Solution (C23, Checked Integers)".

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 30/30 snippets exit 0 with no diagnostics (all snippets are file-scope functions; no `main` needed). The XSI `strerror_r` in `err-strerror-copy` Good is declared by the macOS SDK as `int strerror_r(int, char*, size_t)` (`_string.h`), matching the snippet's usage.

## Source evidence (claim-specific)

- **ERR02-C** (out-params): compliant `read()` writes `*rbytes` only on success - "If no error occurs, and rbytes is not NULL, its value is set ... If an error occurs, read() returns a nonzero value".
- **ERR30-C** (errno rules): "The program should not check the value of errno without first verifying that the function returned an error indicator"; ftell is listed under out-of-band error indicators; for in-band cases "must set errno to 0 before calling ... and then inspect errno before a subsequent library function call".
- **POSIX.1-2024 errno**: value "shall otherwise be defined only after a call to a function for which it is explicitly stated to be set"; "should only be examined when it is indicated to be valid by a function's return value"; APPLICATION USAGE repeats the set-0-then-inspect discipline.
- **Linux errno(3)**: "a function that succeeds is allowed to change errno"; "never set to zero by any system call or library function".
- **Linux read(2)**: may return "fewer bytes ... because read() was interrupted by a signal"; EINTR = "interrupted by a signal before any data was read".
- **FIO34-C** (sentinel-type): the noncompliant `char c` example is called out - "will be interpreted as EOF because this value is sign-extended".
- **MEM12-C** (cleanup): goto chain is "the simplest and cleanest way to organize exits"; kernel `copy_process` example releases "only resources that were successfully opened".
- **Kernel coding style**: §7 "Centralized exiting" + label naming; §16 "Function return values and names"; §22 "the decision to crash the kernel belongs to the user"; WARN_ON_ONCE to avoid a warning filling the log.
- **ERR05-C** (detect-not-exit, status-return, log-once): noncompliant example is exactly `fprintf(stderr, ...); abort();` in application-independent code; such code "is not associated with any application, so it cannot handle errors" but "must still detect errors and report them".
- **strerror(3) / POSIX strerror**: returned pointer "will be invalidated on a subsequent call to strerror() or strerror_l()"; POSIX "might be invalidated or the string content might be overwritten by a subsequent call"; "need not be thread-safe".
- **cppreference**: `<stdckdint.h>` ckd_add/sub/mul; `[[nodiscard]]` "compiler is encouraged to issue a warning"; `realloc` failure leaves the old block valid; `free(NULL)` does nothing; malloc returns null on failure.
- **ERR33-C** (alloc-failure, check-return-values): fwrite/fclose error returns table; realloc noncompliant example "the connection between the original block of memory and p is lost, resulting in a memory leak".
- **INT30-C** (ckd-arithmetic): unsigned wrap table and the C23 checked-integers compliant solution.
- **GCC Common Attributes**: `warn_unused_result` definition.

## Behavior harness results

- errno-after-failure: with stale `errno=ERANGE` and a successful `ftell` at pos 0, the Bad logic returns -1 (false error), Good returns 0.
- errno-zero-before: stale `ERANGE` + valid `LONG_MAX` input - Bad rejects it, Good accepts; a real overflow string is rejected by Good via `ERANGE`.
- errno-capture: an unrelated later call changed `errno` from ENOENT(2) to ERANGE(34); the captured local still reported ENOENT. (`fprintf(stderr, ...)` did not itself clobber errno in this run; man/POSIX still permit any call to change it, which is the rule's basis.)
- strerror-copy: with unknown errnos the first pointer was overwritten by the next call (`"Unknown error: 88888"` replaced the snapshot of `"Unknown error: 99999"`); a copied buffer survived.
- ckd-arithmetic: `ckd_mul(SIZE_MAX,2)` returned overflow=1 while plain `SIZE_MAX*2` wrapped to `SIZE_MAX-1`; `ckd_mul(65536,65536)` returned 0 with `bytes=4294967296`.
- out-params: too-long input - Bad wrote `pos=1000000`, Good left the sentinel 42; success path both write.
- sentinel-type: file bytes `0A FF 0A` - Bad counts 1 line (0xFF aliased EOF on signed char), Good counts 2.
- alloc-failure: `realloc(huge)` returned NULL and the old block still held `"still-valid"`.
- goto-cleanup: Good on `/etc/hosts` rc=0; forced early-failure variant rc=-1, ASan-clean, malloc-zone outstanding bytes delta 0.
- partial-cleanup: Good with second acquisition failing rc=-1, outstanding delta 0; the Bad with first acquisition failing aborts under ASan with BUS inside `free(c->value)` (uninitialized pointer).
- eintr-retry: interrupted blocking read returned EINTR and the retry obtained the byte; a full-pipe blocking write returned -1/EINTR (errno 4) and the retry wrote 4096 bytes; a 256 KiB `send_all` completed with 3 short writes (handler-drained + read-back = 256 KiB).

## Tool ids

- `clang:-Wunused-result` is real: clang 21 accepts it; a typo probe answers "did you mean '-Wunused-result'".
- Discarding a `[[nodiscard]]` result warns under `-Wall`/`-Wunused-result`; `-Wno-unused-result` silences it.
- Note: the macOS SDK does not mark `fwrite`/`fclose` with `warn_unused_result`, so the tool enforces the rule's "annotate checked-return APIs with nodiscard" half; the fwrite/fclose half is the review half of `enforce: both`.

## Formatting, duplicates, links

- All 15: frontmatter complete and consistent, id/path match, section order exact, exactly one `c` fence per Bad/Good, summary <= 30 words, Why 2-5 sentences, keywords 2-8, `related` ids and See Also links resolve, INDEX.md lists exactly the 15 files.
- No duplicate or near-duplicate pair (max summary similarity < 0.6; closest pairs are distinct decisions, e.g. goto-cleanup vs partial-cleanup label granularity, errno-after-failure vs errno-zero-before channels).
- Two contract violations (below): one snippet over the 25-line cap, one banned hedge token.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-err-alloc-failure | verified | cppref realloc "old memory block is not freed and null pointer is returned"; ERR33-C realloc-leak example; both rc=0; run: huge realloc NULL, old content intact |
| c-err-check-return-values | verified | ERR33-C fwrite/fclose rows; cppref nodiscard; GCC warn_unused_result; `-Wunused-result` real and fires/silences as claimed; both rc=0 (tool covers nodiscard half) |
| c-err-ckd-arithmetic | verified | cppref `<stdckdint.h>`; INT30-C C23 checked solution; both rc=0; run: overflow flag correct, plain multiply wraps |
| c-err-detect-not-exit | verified | ERR05-C fprintf+abort noncompliant example; kernel §22 "decision to crash the kernel belongs to the user"; both rc=0 |
| c-err-eintr-retry | verified | man read(2) short-read/EINTR text; both rc=0; run: read EINTR+retry, write EINTR+retry, 256 KiB loop completed with short writes |
| c-err-errno-after-failure | verified | ERR30-C "should not check errno without first verifying ... returned an error indicator"; POSIX "only when indicated valid by return value"; both rc=0; run: stale errno made Bad report a false error |
| c-err-errno-capture | rejected | Summary uses banned hedge token "might" (CONTRACT §4 "no hedging"; §12 forbids consider/might/often). Sources/compile/run all pass; reword to "before any other call can overwrite it" and re-verify |
| c-err-errno-zero-before | verified | ERR30-C set-0-then-inspect + strtoul example; POSIX APPLICATION USAGE same; both rc=0; run: stale ERANGE rejected valid LONG_MAX in Bad, Good correct on valid and overflow |
| c-err-goto-cleanup | verified | MEM12-C goto chain "only resources ... successfully opened"; kernel §7 label naming; both rc=0; ASan early-failure run clean, 0 outstanding bytes (note: empty-file input could read uninitialized buf[0]; shared by both snippets, not this rule's decision) |
| c-err-log-once | verified | ERR05-C app-independent code "cannot handle errors" + fprintf/abort example; kernel WARN_ON_ONCE log-flood rationale; both rc=0; policy claim, not run |
| c-err-out-params | verified | ERR02-C compliant read() sets `*rbytes` only on success; both rc=0; run: failure left Good's out-param untouched, Bad wrote it (note: Bad's success value is last index 2 vs Good length 3; wart outside the rule's decision) |
| c-err-partial-cleanup | rejected | Good snippet is 26 content lines, over CONTRACT §4 cap of 25 (validator `snippet-too-long`; author extraction also 26). Sources/compile/run all pass (ASan: rc=-1, delta 0; Bad aborts in free of uninitialized value). Remove one blank line and re-verify |
| c-err-sentinel-type | verified | FIO34-C noncompliant `char c` sign-extension example; both rc=0; run: 0xFF aliased EOF (Bad 1 line vs Good 2) |
| c-err-status-return | verified | kernel §16 convention; ERR05-C status-reporting mechanisms; both rc=0 |
| c-err-strerror-copy | verified | man strerror(3) "will be invalidated on a subsequent call"; POSIX "might be overwritten ... need not be thread-safe"; both rc=0; run: shared buffer overwritten, copied buffer survives |

## Counts

- Verified: 13/15
- Rejected: 2 (`c-err-errno-capture`, `c-err-partial-cleanup`)
- Blockers: fix the one-word hedge in `c-err-errno-capture` and the 26-line Good in `c-err-partial-cleanup`, then re-verify. `INDEX.md` still reads `verified: 0` and must be updated to `verified: 13` by its owner.

Only the 13 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched.
