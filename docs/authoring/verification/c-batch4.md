# Verification Report - C Batch 4 (`conv` + `sec`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `conv-*.md` + 14 `sec-*.md` (26 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; deterministic validator `node dist/rules/cli.js validate --lang c --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-c-batch4` (urls, snippets, harness, harness.log)

## Method

1. Fetched all 25 unique cited URLs with `curl` (browser UA, `-L`): 22 x HTTP 200, 3 x HTTP 404 (`sec-no-deprecated`, `sec-sanitize-subsystem`, `sec-secure-directory`). Probed the correct `recommendations/...` paths for the 404 pages: all 200 with the same titles and the claim-supporting text.
2. Extracted both fenced snippets from each of the 26 rules (52 snippets) and compiled each independently with `clang -fsyntax-only -std=c23 -Wall`: 52/52 exit 0, zero diagnostics.
3. Built and ran 25 `main()` harnesses covering every runtime claim (ASan for string/adjacent bounds, UBSan for signed shift; `-O2` disassembly for the wipe rule). All bounded, offline, in scratch.
4. Checked frontmatter (gray-matter/js-yaml, same parser family as the validator), section order, fence count/language, summary word/hedge scan, Why sentence count, keywords count, line caps, banned tokens/elisions, `related`/See Also/INDEX links, and near-duplicates across the whole C pack.
5. Ran the deterministic validator on the C pack.

## Source verification (claim support)

- CERT pages confirmed with claim-specific text: INT13-C ("bitwise operations on signed integers are implementation-defined"), INT31-C (truncation/sign loss; unsigned-to-signed implementation-defined), INT02-C (-1 converted to unsigned example), INT01-C (int counter vs size_t bound), INT30-C (wrap table), FLP34-C (out-of-range floating conversion is UB; isnan/FLT_MAX example), ENV34-C (getenv "may be overwritten by a subsequent call"; "not thread-safe"; list includes setlocale/strerror/localtime), FIO01-C ("file names are only loosely bound"; "reasserted every time"; fstat over stat), MSC41-C (strings/hard-code), API01-C (strings immediately before sensitive data), ENV33-C (shell injection via system), MSC30-C (rand "no guarantees", short cycle, predictable; arc4random alternative), STR31-C (space for terminator), MEM03-C (clear before free; points to MSC06-C for the optimization discussion), MSC24-C (atoi obsolescent -> strtol), STR02-C (whitelisting recommended), FIO15-C (secure directory; compliant solution walks root->leaf checking ownership and S_IWGRP|S_IWOTH).
- cppreference confirmed: object (integer byte use "implementation-defined ... big-endian ... little-endian"), enum (underlying type "implementation-defined"; fixed-underlying `enum : type` syntax), integer types (intN_t "width of exactly N ... no padding bits"; PRI macro section), conversion (integer promotions; usual arithmetic conversions), fprintf ("length modifier ... specifies the type of the corresponding argument"; "If any argument after default argument promotions is not the type expected by the corresponding conversion specification ... behavior is undefined" - present in raw HTML), assert ("If NDEBUG is defined ... assert does nothing").
- man open(2) confirmed: default "remain open across an execve"; O_CLOEXEC "essential in some multithreaded programs, because using a separate fcntl(2) F_SETFD operation ... does not suffice to avoid race conditions"; "mode of the created file is (mode & ~umask)"; O_EXCL semantics.
- One unsupported citation: `conv-pointer-difference` cites cppreference "Pointer declaration", which contains zero occurrences of `ptrdiff` and never states the result type of pointer subtraction. The claim is on cppreference "operator_arithmetic": "P1-P2 ... has the type ptrdiff_t (which is a signed integer type ...)". Citation fix required.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 52/52 snippets exit 0 with no diagnostics (26 rules). C23 fixed-underlying enum syntax compiles under clang 21.

## Behavior harness results (ASan/UBSan noted)

- conv-checked-narrow: n=INT_MAX+1 Bad=-2147483648 (truncation), n=2^32 Bad=0; Good rc=-1 both.
- conv-mixed-signs: pick(0,-1) Bad=SIZE_MAX (18446744073709551615), Good=0.
- conv-printf-length: Bad prints 1 for 0x100000001, Good prints 4294967297.
- conv-float-narrowing: 1e300/-1e300 Bad=inf, Good=0; NAN Bad=nan, Good=0.
- conv-unsigned-underflow: remaining(1,2) Bad=SIZE_MAX, Good=0.
- conv-endian-explicit: 0x01020304 Bad=04 03 02 01 (host LE), Good=01 02 03 04.
- conv-pointer-difference: mmap 2^31+17 ints; distance 2147483664; Bad(int)=-2147483632, Good(ptrdiff_t)=2147483664 (claim true; citation is the defect).
- conv-promotion: (200,56) Bad=0, Good=1. conv-bitwise-unsigned: UBSan "left shift of 1 by 31 places cannot be represented in type 'int'" on Bad; Good 1u<<31=2147483648; -8>>1=-4 vs (unsigned)-8>>1=2147483644. conv-enum-underlying: sizeof Bad=4 (underlying unsigned int), Good=1 (unsigned char).
- sec-descriptor-identity: stat-check passed then open got "EVILDATA" after a swap; descriptor kept "REALDATA" and fstat stayed valid.
- sec-random: rand seeded 42 reproduced identically across runs; arc4random_buf differed between runs.
- sec-copy-env-results: localtime returned the same static struct (a==b), tm_year changed 70->101 after the second call, saved copy stayed 70; getenv pointers were stable on this platform ("may be overwritten" is accurate).
- sec-wipe-secrets: exact Bad snippet at -O2 compiles to a bare `ret` (copy+wipe elided); exact Good retains the volatile-pointer indirect `blr` call. Use-variant: bad_sum has no memset call, good_sum loads `_secure_memset` and calls it.
- sec-string-bounds: ASan stack-buffer-overflow WRITE of size 6 (strcpy) on Bad; Good rc=-1, no write.
- sec-close-on-exec: child after exec sees fd "open" without the flag, "closed" with O_CLOEXEC.
- sec-file-mode: umask 0 -> open(0666)=0666, open(0600|O_EXCL)=0600, second O_EXCL fails EEXIST; umask 077 -> open(0666)=0600.
- sec-secure-directory: d700=1, d777=0, /tmp=0 (world-writable).
- sec-assert-not-security: with -DNDEBUG Bad SIGSEGV (rc=139), Good rc=-1.
- sec-hardcoded-secrets: `strings` finds "hunter2" in the Bad binary, not in the Good binary (Good reads env).
- sec-no-adjacent-secrets: ASan stack-buffer-overflow read (strlen) on Bad; Good memchr returns 16.
- sec-no-deprecated: atoi("abc")=0 indistinguishable from "0"; Good rejects; atoi("999...") UB-ish -1; Good -1.
- sec-sanitize-subsystem: Bad built "reports/../secret.txt" and opened the escaped file; Good rejected "../secret", accepted "report_1".
- sec-no-system: system("printf A; printf B") printed AB (shell ran `;`); execl kept "A; printf B" as one argument.

## Notes to assess

- `sec-wipe-secrets` volatile function-pointer idiom: sound. The compiler must load the volatile pointer and perform an opaque indirect call, so the wipe cannot be elided; demonstrated at -O2 for both the exact snippet and a use-variant. Local probe: `memset_explicit` undeclared in the macOS SDK (C23 function not exposed), `explicit_bzero` undeclared, `memset_s` compiles only with `__STDC_WANT_LIB_EXT1__`. The rule's Why lists memset_s/explicit_bzero/volatile pointer; the volatile form is the portable, locally compilable option. Non-blocking note: a C23-first version could name `memset_explicit` where the toolchain provides it.
- POSIX-flavored sec rules (`sec-no-system`, `sec-close-on-exec`, `sec-file-mode`, plus `sec-descriptor-identity`, `sec-secure-directory`, `sec-random`): consistent with pack scope. `sources.md` lists POSIX.1-2024 (#5) and Linux man-pages (#6) as primary sources, and `io-epipe`/`io-exclusive-create` set the precedent. No change needed.
- `conv-float-narrowing`: the Good checks isnan/FLT_MAX but not FLT_MIN/denormals, although the Why mentions denormals and CERT FLP34-C's example also tests `isless(fabs(d), FLT_MIN)`. The summary only promises NaN/range rejection, so this is non-blocking; consider an FLT_MIN check in a future edit.
- `conv-fixed-width`: the cited cppreference page documents intN_t exact widths and optionality; the premise that `int`/`long` widths vary is implicit rather than quoted. Non-blocking.
- `sec-secure-directory`: the Good checks only the leaf directory, while the summary says "the directory and its parents" and the cited FIO15-C compliant solution walks root->leaf (ownership + write bits + symlinks). Rejection reason #2; fix by rewording the summary or walking parents.

## Formatting, validator, duplicates, links

- All 26: section order, exactly one `c` fence per Bad/Good, summaries <= 30 words with no hedging, Why 2-5 sentences, keywords 2-8, `related` ids and See Also links resolve; no `...`/TODO/FIXME anywhere; no snippet over 25 lines; near-duplicate scan (summaries across the whole C pack, >= 0.55) found only conv-checked-narrow <-> conv-float-narrowing at 0.59 (distinct decisions).
- Deterministic validator on the C pack: 3 errors total; in scope only `sec-file-mode` (`triggers.keywords` "must be an array of non-empty strings" - unquoted `0600` parses as octal 384). Out of scope: `io-format-string-literal` fm-parse and `unsafe-null-arith` field-type (other batches).
- `INDEX.md` lists all 12 conv + 14 sec rules and is consistent with the directory. The count line (`Rules: 122 (verified: 67)`) is the owner's update after this batch (67 + 21 = 88 if only these flips count).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-conv-bitwise-unsigned | verified | INT13-C signed-bitwise/shift text; 52/52 compile; UBSan fires on Bad `1<<31`, Good clean; -8>>1=-4 vs unsigned 2147483644 |
| c-conv-checked-narrow | verified | INT31-C truncation/sign text; Bad(INT_MAX+1)=-2147483648, Bad(2^32)=0; Good rc=-1 |
| c-conv-endian-explicit | verified | cppreference object: byte use implementation-defined, big/little-endian; Bad bytes 04 03 02 01 vs Good 01 02 03 04 |
| c-conv-enum-underlying | verified | cppreference enum: implementation-defined compatible type + fixed-underlying syntax; sizeof 4 vs 1; _Generic Good=unsigned char |
| c-conv-fixed-width | verified | cppreference integer types: intN_t exact width/no padding; PRI section; compile + size probe |
| c-conv-float-narrowing | verified | FLP34-C out-of-range conversion UB + isnan/FLT_MAX example; 1e300/NAN Bad=inf/nan, Good=0 |
| c-conv-mixed-signs | verified | INT02-C -1-to-unsigned example + cppreference conversion; pick(0,-1) Bad=SIZE_MAX, Good=0 |
| c-conv-pointer-difference | **rejected** | cited "Pointer declaration" page has 0 `ptrdiff` occurrences; claim is on operator_arithmetic ("P1-P2 ... type ptrdiff_t"). Add that citation and re-verify (claim itself runs true: Bad=-2147483632 vs Good=2147483664) |
| c-conv-printf-length | verified | cppreference fprintf: length modifier specifies argument type + UB on mismatch (raw HTML); PRI macros; Bad prints 1 for 0x100000001, Good 4294967297 |
| c-conv-promotion | verified | cppreference conversion integer promotions + INT02-C; (200,56) Bad=0 Good=1 |
| c-conv-size-type | verified | INT01-C int-counter/size_t rationale; both compile; type-level claim |
| c-conv-unsigned-underflow | verified | INT30-C wrap table; remaining(1,2) Bad=SIZE_MAX, Good=0 |
| c-sec-assert-not-security | verified | cppreference assert NDEBUG text; -DNDEBUG Bad SIGSEGV, Good rc=-1 |
| c-sec-close-on-exec | verified | open(2): default across execve; O_CLOEXEC vs fcntl F_SETFD race; child fd "open" without flag, "closed" with |
| c-sec-copy-env-results | verified | ENV34-C overwrite/thread-safety text + function list; localtime a==b, year 70->101, copy intact |
| c-sec-descriptor-identity | verified | FIO01-C loose binding/reasserted + fstat over stat; Bad opened EVILDATA after passing stat, Good kept REALDATA |
| c-sec-file-mode | **rejected** | YAML: unquoted `0600` parses as octal 384; validator field-type error. Quote "0600" and re-verify (behavior otherwise confirmed: 0666/0600/EEXIST/umask) |
| c-sec-hardcoded-secrets | verified | MSC41-C hard-code/strings text; `strings` finds hunter2 in Bad, not in Good |
| c-sec-no-adjacent-secrets | verified | API01-C strings-before-sensitive-data text; ASan read overflow on Bad, Good memchr=16 |
| c-sec-no-deprecated | **rejected** | cited URL `.../rules/miscellaneous-msc/msc24-c/` = 404; correct `.../recommendations/...` = 200 and supports atoi->strtol. Fix URL and re-verify |
| c-sec-no-system | verified | ENV33-C shell-injection text; system ran `;` (AB), execl kept argument data |
| c-sec-random | verified | MSC30-C rand no-guarantees/predictable + arc4random; seed-42 rand identical across runs, arc4random differs |
| c-sec-sanitize-subsystem | **rejected** | cited URL `.../rules/characters-and-strings-str/str02-c/` = 404; correct `.../recommendations/...` = 200 and supports whitelisting. Fix URL and re-verify |
| c-sec-secure-directory | **rejected** | (1) cited URL `.../rules/input-output-fio/fio15-c/` = 404 (correct `.../recommendations/...` = 200); (2) Good checks only the leaf directory while the summary says "and its parents" and FIO15-C walks root->leaf. Fix URL and align summary/body, then re-verify |
| c-sec-string-bounds | verified | STR31-C terminator text; ASan strcpy WRITE overflow on Bad, Good rc=-1 |
| c-sec-wipe-secrets | verified | MEM03-C clear-before-free (+MSC06-C pointer); -O2 asm: Bad snippet elides to `ret`, Good retains volatile-pointer `blr`; idiom sound |

## Counts

- Verified: 21/26 (flipped to `status: verified`)
- Rejected: 5 (`c-conv-pointer-difference`, `c-sec-file-mode`, `c-sec-no-deprecated`, `c-sec-sanitize-subsystem`, `c-sec-secure-directory`) - left `status: draft`
- Blockers: one citation addition (pointer difference); one YAML quote (`"0600"`); three one-segment URL fixes (`rules` -> `recommendations`) plus one summary/body alignment in `sec-secure-directory`.

Only the 21 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched.

---

# Addendum - Re-verification of the five rejected rules (2026-10-05)

Scope: the five rejected rules after fixes: `conv-pointer-difference`, `sec-file-mode`, `sec-no-deprecated`, `sec-sanitize-subsystem`, `sec-secure-directory`. Method: re-read each file; re-fetched every cited URL fresh (all HTTP 200); recompiled all 52 snippets with `clang -fsyntax-only -std=c23 -Wall` (52/52 rc=0, zero diagnostics); re-ran the deterministic validator; re-ran the four prior harnesses and added `h26_securepath` for the rewritten Good.

## Per-rule re-verdicts

- `c-conv-pointer-difference` - **verified**. Added source cppreference "Arithmetic operators" (`/w/c/language/operator_arithmetic`, 200) states: "P1-P2 has the value equal to I-J and the type ptrdiff_t (which is a signed integer type ...)". Both snippets compile; h7 re-run: distance 2147483664, Bad(int)=-2147483632 vs Good(ptrdiff_t)=2147483664.
- `c-sec-file-mode` - **verified**. `triggers.keywords` now `[permissions, "0600", umask, open, secret file]`; js-yaml parses `"0600"` as a string, the validator `field-type` error is gone (re-run: only out-of-scope `style-bool.md` errors remain). h18 re-run: umask 0 -> 0666/0600, second O_EXCL fails EEXIST, umask 077 -> 0600.
- `c-sec-no-deprecated` - **verified**. The current revision cites `/recommendations/miscellaneous-msc/msc24-c/` -> 200, which lists `atoi()` as obsolescent with `strtol()` as the replacement. h23 re-run: atoi("abc")=0 indistinguishable from "0", Good rejects. First-pass note: my initial fetch used the `/rules/` variant exactly as it appeared in the first read (fetch log, 404); the file mtime (00:20:15) predates the first pass, so I cannot determine whether the first read was stale or the citation was corrected without a timestamp change. Re-verified against the current revision.
- `c-sec-sanitize-subsystem` - **verified**. URL now `/recommendations/characters-and-strings-str/str02-c/` -> 200 ("Whitelisting is recommended over blacklisting"). Both snippets compile; h24 re-run: Bad built `reports/../secret.txt` and opened the escaped file; Good rejected `../secret`, accepted `report_1`.
- `c-sec-secure-directory` - **verified**. URL now `/recommendations/input-output-fio/fio15-c/` -> 200. The Good is rewritten as a root->leaf prefix walk (21 lines, compiles clean), and the Why now explains the parent walk. New harness `h26_securepath` (10/10): all-secure relative and absolute paths accepted; group-writable (0770) and world-writable (0777) intermediate components rejected; `/tmp` and `/tmp/*` rejected; a regular-file leaf rejected; missing path rejected; >255-char path rejected; `/` accepted. Summary ("the directory and its parents") now matches the body. Non-blocking: the walk checks write bits only, while FIO15-C's reference solution also checks owner/root and symlinks.

## Updated counts

- Verified: 26/26 (all five flipped to `status: verified`)
- Rejected: 0
- Addendum changes: the five `status:` fields and this addendum only.
