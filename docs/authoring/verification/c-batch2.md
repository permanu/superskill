# Verification Report - C Batch 2 (`mem`, `ptr`) + err fixes

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 14 `mem-*.md`, 14 `ptr-*.md`, plus the two fixed batch-1 rules `err-errno-capture.md` and `err-partial-cleanup.md` (30 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; `pdftotext` (poppler) for the WG14 draft; deterministic validator `node dist/rules/cli.js validate --lang c --no-compile --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-c-batch2` (urls, snippets, probes, harnesses)

## Method

1. Fetched all 24 new cited URLs with `curl` (all HTTP 200) plus the reused kernel/cppreference pages; extracted the claim-specific passages quoted below.
2. Downloaded WG14 N3220 and extracted it with `pdftotext`, so the two standard-level claims were verified against the draft text directly (not just secondary pages).
3. Extracted both fenced snippets from each rule (60 snippets) and compiled each with the required command `clang -fsyntax-only -std=c23 -Wall`: 60/60 rc=0, zero diagnostics.
4. Built and ran 26 `main()` harnesses (ASan/UBSan where they sharpen the claim) for every runtime behavior; all bounded with `alarm`/perl timeouts and offline.
5. Re-verified the two fixes (summary hedge scan, snippet line cap, recompile, rerun).
6. Ran the deterministic validator on the C pack and mechanically re-checked frontmatter, section order, one `c` fence per Bad/Good, summary/Why/keyword counts, line caps, banned tokens/elisions, `related`/See Also/INDEX links, and near-duplicates.

## WG14 note

`webfetch` cannot read `application/pdf`, but `pdftotext` is available, so N3220 was checked directly. Two rules hinge on the current standard and were confirmed from the draft:

- 6.3.2.3p8: "If a converted pointer is used to call a function whose type is not compatible with the referenced type, the behavior is undefined." (the claim in `ptr-fn-pointer-cast` is true)
- 7.24.3.7p3: realloc's UB conditions include "or if the size is zero" - C23 makes `realloc(p, 0)` undefined behavior (cppreference confirms this is the "(since C23)" wording; it was implementation-defined until C23). The `mem-realloc-zero` Why is correct.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 60/60 snippets exit 0 with no diagnostics (28 rules + the 2 fixed err rules). C23 `nullptr` compiles under clang 21.

## Behavior harness results (ASan/UBSan noted)

- mem-sizeof-object: layout-drift variant (struct grew a `char`) - Bad `malloc(2*sizeof(double))` then tag write = ASan heap-buffer-overflow; Good `sizeof *p` clean.
- mem-zero-init: Bad returned an indeterminate `retries` (0x1 after stack poisoning), Good 0. Illustrative; MSan unavailable on darwin.
- mem-zero-size: `malloc(0)` returned non-NULL (ASan 1-byte region); writing through it = heap-buffer-overflow. Good returns NULL.
- mem-realloc-zero: macOS `realloc(p,0)` returned non-NULL here; C23 makes it UB regardless. Good frees explicitly and NULLs.
- mem-aligned-alloc: `aligned_alloc(64, 4)` returned NULL on this libc; Good(1)=NULL, Good(16)=non-NULL and 64-aligned.
- mem-flex-array: Bad `malloc(sizeof *p)` then `data[0]` write = heap-buffer-overflow; Good `offsetof + n` works.
- mem-bounded-stack: 64 MiB VLA = SIGSEGV; clamped-heap Good works.
- mem-overlap-copy: ASan `memcpy-param-overlap` on the Bad memcpy; Good memmove clean.
- mem-single-owner: Bad double-free (ASan); Good rc=-1 clean.
- mem-matching-free: Bad interior `free` = "attempting free on address which was not malloc()-ed"; Good clean.
- mem-use-after-free: Bad heap-use-after-free; Good clean.
- mem-clear-after-free: Bad double-frees on the second call; Good survives both calls.
- mem-no-dangling-return: Bad stack-use-after-return (`detect_stack_use_after_return=1`); Good clean.
- ptr-byte-access: bytes `FF 01` - Bad sum wraps to 0 (sign-extended 0xFF), Good 256.
- ptr-bounds-arith: `slot(-1)` - Bad returns `table-1` (offset -1), Good NULL.
- ptr-offsetof: Bad reads 7 (value's low bytes), Good reads 42.
- ptr-integer-roundtrip: Bad uint32 round-trip not equal; Good uintptr_t round-trip equal.
- ptr-string-termination: Bad `printf("%s", tag)` = ASan stack-buffer-overflow read; Good clean.
- ptr-null-check: Bad `strcpy(NULL, ...)` = SIGSEGV; Good returns -1.
- ptr-no-const-cast: Bad writes a string literal = SIGBUS; Good copies into mutable storage.
- ptr-alignment-cast: UBSan "load of misaligned address ... for type 'int'" on the Bad; Good clean.
- ptr-count-explicit: Bad cleared 2 of 5 elements (sizeof pointer), Good 5 of 5.
- ptr-nullptr: `open_log(nullptr)`=-1, file path=0.
- err fixes: `err-errno-capture` Good exercises the capture path, no hedge tokens in the summary; `err-partial-cleanup` Good is 25 lines, compiles, runs rc=-1 with malloc-zone outstanding delta 0.

Skipped with reasons: `ptr-strict-alias` and `ptr-restrict-contract` (UB is optimizer-dependent; not reliably observable, no sanitizer diagnoses strict aliasing or restrict violations; sources/standard back the claims); `ptr-fn-pointer-cast` (executing the incompatible call is itself UB; the tool warning is the evidence); `mem-no-cast-malloc` (diagnostic/redundancy claim, no runtime behavior).

## Tool id

`clang:-Wcast-function-type-strict` is real: clang 21 accepts it, a typo probe answers "did you mean '-Wcast-function-type-strict'", and it fires on the Bad snippet with exactly "cast from 'compare_fn' (aka 'int (*)(const void *, const void *)') to 'int (*)(int)' converts to incompatible function type". The Good is clean, and plain `-Wall` does not enable it (the explicit tool id is required). The Clang DiagnosticsReference documents the flag and its diagnostic text.

## Fixes re-verified

- `err-errno-capture`: summary now "Capture errno in a local on the failure path before any reporting or other call runs." - no `consider/might/often` token; sources/compile/run all pass.
- `err-partial-cleanup`: Good is 25 content lines (cap 25); Bad 24; compiles; behavior re-run passes.

## Formatting, validator, duplicates, links

- All 30: section order, one `c` fence per Bad/Good, summary <= 30 words, Why 2-5 sentences, keywords 2-8, `related` ids and See Also links resolve; no duplicate/near-duplicate pair (max summary similarity < 0.6).
- Deterministic validator (dist build) on the C pack: 4 in-scope `field-type` errors (unquoted YAML `NULL` parses as `null`) and 2 in-scope `comment-elision` warnings; no other in-scope issues. Details in the verdict table.
- `INDEX.md` lists the 43 err/mem/ptr rules (all of this batch included) but not the in-flight `io-*`/`unsafe-*` files currently in the directory; that is outside this batch's scope.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| c-mem-aligned-alloc | **rejected** | Why says "Rounding the byte count up to the next multiple keeps the over-aligned contract satisfied", but the Good rejects non-multiples instead: run shows Bad(1) and Good(1) both return NULL, so the "mysterious allocation failure" the Why names is not fixed. Make the Good round up (or align Why and snippet) and re-verify |
| c-mem-bounded-stack | verified | MEM05-C stack-exhaustion/DoS text; both rc=0; run: 64 MiB VLA SIGSEGV, clamped-heap Good works |
| c-mem-clear-after-free | **rejected** | `triggers.keywords: [dangling pointer, double free, NULL, free]` - unquoted `NULL` parses as YAML null; validator `field-type` error. Quote `"NULL"` and re-verify |
| c-mem-flex-array | verified | MEM33-C FAM storage/copy text; both rc=0; run: Bad `data[0]` write heap-buffer-overflow, Good `offsetof + n` works |
| c-mem-matching-free | verified | cppreference free (pointer returned by allocation family, interior/other UB); both rc=0; ASan bad-free on Bad, Good clean |
| c-mem-no-cast-malloc | verified | kernel "Casting the return value which is a void pointer is redundant"; cppreference malloc; both rc=0 (no runtime claim) |
| c-mem-no-dangling-return | verified | DCL30-C expired-lifetime example; both rc=0; ASan stack-use-after-return on Bad, Good clean |
| c-mem-overlap-copy | verified | cppreference memcpy "If the objects overlap ... behavior is undefined"; both rc=0; ASan memcpy-param-overlap on Bad, Good memmove clean |
| c-mem-realloc-zero | verified | cppreference realloc "(since C23): if new_size is zero, the behavior is undefined"; N3220 7.24.3.7p3 confirms; both rc=0; macOS `realloc(p,0)` behavior is exactly the ambiguity the rule removes |
| c-mem-single-owner | **rejected** | Bad comments use `...` as prose elision on two lines (`/* may free msg here ... */`, `/* ... and the caller frees it again */`); CONTRACT §12 forbids elision, validator flags `comment-elision` x2. Rewrite the comments and re-verify |
| c-mem-sizeof-object | verified | kernel "alternative form where struct name is spelled out ... opportunity for a bug when the pointer variable type is changed"; both rc=0; layout-drift variant heap-buffer-overflow on Bad, Good clean |
| c-mem-use-after-free | verified | cppreference free lifetime text; both rc=0; ASan heap-use-after-free on Bad, Good clean |
| c-mem-zero-init | verified | EXP33-C indeterminate-value example; both rc=0; Bad returned indeterminate `retries`, Good 0 |
| c-mem-zero-size | verified | MEM04-C "result of calling malloc(0) ... is implementation-defined"; both rc=0; run: malloc(0) non-NULL, write heap-buffer-overflow; Good NULL |
| c-ptr-alignment-cast | verified | EXP36-C "If the resulting pointer is not correctly aligned ... behavior is undefined"; both rc=0; UBSan misaligned load on Bad, Good clean |
| c-ptr-bounds-arith | verified | ARR30-C out-of-bounds pointer text (one-past-end well-defined); both rc=0; `slot(-1)` returns invalid pointer in Bad, NULL in Good |
| c-ptr-byte-access | verified | cppreference object (character-type access; every bit pattern distinct); both rc=0; Bad checksum sign-extends, Good 256 |
| c-ptr-const-params | verified | cppreference const; both rc=0; qualifier-only change, no runtime claim |
| c-ptr-count-explicit | verified | ARR01-C sizeof(pointer parameter) example; kernel ARRAY_SIZE section; both rc=0; Bad cleared 2/5, Good 5/5 |
| c-ptr-fn-pointer-cast | **rejected** | UB claim is true (N3220 6.3.2.3p8) but neither cited source states it: Clang DiagnosticsReference documents only the warning, and the cppreference Pointer declaration page has no function-pointer-call UB sentence. Add a citation that states the UB and re-verify. Tool id itself verified |
| c-ptr-integer-roundtrip | verified | INT36-C "If the result cannot be represented in the integer type, the behavior is undefined" + N3220 6.3.2.3p6; both rc=0; Bad truncates, Good round-trips |
| c-ptr-no-const-cast | verified | EXP05-C cast-away-const example; cppreference const "Any attempt to modify an object whose type is const-qualified results in undefined behavior"; both rc=0; Bad SIGBUS on literal, Good copies |
| c-ptr-null-check | **rejected** | `triggers.symbols: [NULL, nullptr]` - unquoted `NULL` parses as YAML null; validator `field-type` error. Quote `"NULL"` and re-verify |
| c-ptr-nullptr | **rejected** | `triggers.keywords` and `triggers.symbols` both contain unquoted `NULL` (YAML null); two validator `field-type` errors. Quote `"NULL"` and re-verify |
| c-ptr-offsetof | verified | cppreference offsetof (real offset incl. padding); both rc=0; Bad reads the wrong bytes, Good reads the member (note: Bad's `sizeof(long)` equals value's offset, so it demonstrates a hardcoded offset rather than a padding miscalculation) |
| c-ptr-restrict-contract | verified | cppreference restrict aliasing example ("d[1] is accessed through both p and q ... Undefined behavior"); both rc=0; behavior not run (optimizer-dependent UB) |
| c-ptr-strict-alias | verified | EXP39-C (optimized aliased assignment eliminated) + cppreference object effective-type rules; both rc=0; not runnable deterministically |
| c-ptr-string-termination | verified | STR32-C non-null-terminated sequence; both rc=0; ASan stack-buffer-overflow read on Bad, Good clean |
| c-err-errno-capture (fixed) | verified | Hedge removed; sources/compile/run pass; capture path exercised |
| c-err-partial-cleanup (fixed) | verified | Good 25 lines (cap 25); compiles; run rc=-1 with 0 outstanding bytes |

## Counts

- Verified: 24/30
- Rejected: 6 (`c-mem-aligned-alloc`, `c-mem-clear-after-free`, `c-mem-single-owner`, `c-ptr-fn-pointer-cast`, `c-ptr-null-check`, `c-ptr-nullptr`)
- Blockers: fix the six and re-verify. Three are one-word YAML quoting fixes; one is a comment rewrite; one is a citation addition; one is a Why/Good alignment in `mem-aligned-alloc`.
- `INDEX.md` still reads `Rules: 43 (verified: 13)`; after this batch it should read `verified: 37` (owner update; the in-flight `io-*`/`unsafe-*` files also need indexing when ready).

Non-blocking notes: `mem-no-dangling-return` includes `<stdio.h>` in both snippets although neither uses stdio (§4 "imports/includes only where needed"); `mem-no-cast-malloc`'s Bad includes `<stdlib.h>`, so it does not exhibit the missing-prototype hazard the Why names (decision still backed by kernel style); `mem-bounded-stack` and `mem-flex-array` Whys describe aspects (hybrid stack bound, keeping FAM structs off the stack) not shown by their snippets.

Only the 24 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched.

---

# Addendum - six fixes re-verified (2026-10-05)

All six rejected rules were fixed and re-checked against the same bar; each now passes and has been flipped `draft` -> `verified`.

| rule id | re-check evidence |
|---|---|
| c-mem-aligned-alloc | Good now rounds with a wrap guard (`bytes % 64 == 0 ? bytes : bytes + (64 - bytes % 64)`; `rounded < bytes` catches wrap) and the Why states it; both rc=0. Run: good(0)=NULL, good(1)=non-NULL 64-aligned, good(16)=64-aligned, good(17)=128-aligned, rounding-overflow case=NULL. Bad unchanged |
| c-mem-clear-after-free | `"NULL"` now quoted; gray-matter yields the string; validator clean; code unchanged - ASan double-free on Bad, Good survives both calls |
| c-ptr-null-check | `"NULL"` quoted in `symbols`; validator clean; compiles; prior run evidence stands (Bad SIGSEGV, Good -1) |
| c-ptr-nullptr | `"NULL"` quoted in `keywords` and `symbols`; validator clean; compiles; prior nullptr run evidence stands |
| c-mem-single-owner | Elisions replaced with real comments ("may already free msg", "the caller frees it again: double free"); no `...` remains; validator clean; ASan double-free on Bad, Good clean |
| c-ptr-fn-pointer-cast | WG14 N3220 added as a third source and the Why cites 6.3.2.3p8; the draft text was extracted with `pdftotext` and confirms "If a converted pointer is used to call a function whose type is not compatible with the referenced type, the behavior is undefined."; `-Wcast-function-type-strict` still fires on the Bad; both compile clean |

Re-check details: deterministic validator reports zero errors and zero warnings on all six (remaining pack errors are the in-flight `io-*`/`unsafe-*` files, outside this batch); 12/12 fixed snippets compile with `clang -fsyntax-only -std=c23 -Wall` and stay <= 25 lines; YAML parses `"NULL"` as a string in all three trigger arrays.

Final counts: **verified 30/30, rejected 0** for the batch-2 scope, and all 43 err/mem/ptr rules in the pack are now verified. `INDEX.md` should be updated by its owner to `Rules: 43 (verified: 43)` (it currently reads `verified: 13`).
