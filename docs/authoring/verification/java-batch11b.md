# Java Batch 11B (`data`, `net`, `ffi`, `sec`, `conv`, `anti`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: 37 rules — `data` (7), `net` (5), `ffi` (4), `sec` (4: path-traversal, no-follow-links, zip-slip, permissions), `conv` (5), `anti` (12). Part A (`pat`/`type`/`api`/`conc`/`ann`/`const`/`test`) was not touched.
- Toolchain: javac/java 23.0.2 (OpenJDK, Homebrew arm64). Error Prone 2.50.0 official `with-dependencies` (sha256 `8ec037a6…`) plus `io.github.eisop:dataflow-errorprone:3.41.0-eisop1` (sha256 `10434fba…`) — the latter is required on the processorpath for `ReferenceEquality`; without it the plugin crashes with `NoClassDefFoundError: ForwardTransferFunction`. H2 2.5.252 (sha256 `90b11dc4…`).
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch11b/` (`compile/` 74 extracted snippets + `compile-results.json`, `behavior/` 3 harnesses + charset probe, `sources/` 28 saved pages + `sources.json`, `structural.json`, `ep.mjs`, `format.mjs`).

## Method

1. **Sources.** Fetched all 28 unique cited URLs — every one returned HTTP 200 — and checked each quoted/paraphrased claim against normalized page text (fuzzy re-match for HTML tag/entity spacing). All claims match except `net-httpclient-close`: `"closes this client"` appears nowhere in the JDK 23 HttpClient page (nor JDK 21/22/24/25), whose `close()` actually says `"Initiates an orderly shutdown in which requests previously submitted to send or sendAsync are run to completion, but no new request will be accepted"`. The `AutoCloseable` interface and `close()` existence are confirmed.
2. **Compile.** Extracted both snippets from all 37 rules (74 files) and compiled each independently with `javac 23.0.2 -Xlint:all -d <scratch>`: **74/74 compiled**. Only warnings: `[restricted]` on the three FFM Good snippets (expected for native-access methods).
3. **Behavior** (86 checks, all pass unless noted):
   - General harness (61 checks): conv (`Objects.equals/toString`, `parseInt(radix)`, `parseUnsignedInt("4294967295") == -1`, `toArray(String[]::new)`); anti (`List.of(null)` NPE vs `Arrays.asList` carrying null, `Set.of()` immutable, `max = max` no-op vs `this.max = max`, `==` false / `equals` true, `String.equals(Integer)` always false, enum switch BLUE, `"a,b,,"` split length 2 vs 4 and `""`/`":"` lengths 1/0, self-compare, `Arrays.asList(int[])` size 1 vs stream-boxed size 3, `Class.cast` CCE, explicit UTF-8); path probe (normalize escapes base; bounded helper throws); **zip-slip probe** (crafted `../evil.txt` target normalizes outside destination, Good throws, vulnerable extraction actually wrote outside the root); permissions (default `rw-r--r--`, chmod → `rw-------`); net against a local `HttpServer` (shared client 3 requests, 100 ms timeout → `HttpTimeoutException`, two 400 ms `sendAsync` calls in 426 ms, `ofString`/`ofInputStream`, try-with-resources + send-after-close → `IOException: closed`).
   - FFM harness (9 checks): `libraryLookup("c", Arena.global())` **throws `IllegalArgumentException: Cannot open library: c` on macOS** (also `"libc"`, `"libSystem.B"`); string-path lookup works (`strlen` found, missing symbol → empty `Optional`); `defaultLookup()` finds `strlen` (the cited Linker page's own pattern); downcall `strlen("hello") == 5`; `upcallStub` round-trip `triple(14) == 42`; `JAVA_INT` round-trip vs byte-assembly `0x04030201` on little-endian.
   - JDBC/H2 harness (16 checks): auto-commit Bad leaves 90/100 after simulated failure, transaction rollback 100/100, commit 90/110; `executeBatch` 3 updates; `setFetchSize(1000)` full scan; `getNextException` chain; `getGeneratedKeys` (4, 5); `wasNull` (NULL → 0/true, real 0 → false); `setQueryTimeout(30)` works; explicit `Statement.cancel()` aborts a running query (`JdbcSQLTimeoutException … Statement was canceled`).
   - Charset probe: same byte `0xE9` decodes as `é` (ISO-8859-1), `U+FFFD` (UTF-8/US-ASCII); explicit UTF-8 stable across all three JVM runs.
4. **Error Prone 2.50.0** on the anti Bad/Good pairs (one cited check at WARN each): `SelfAssignment`, `ReferenceEquality`, `EqualsIncompatibleType`, `UnusedVariable`, `MissingCasesInEnumSwitch`, `SelfComparison`, `PrimitiveArrayPassedToVarargsMethod`, `TypeParameterUnusedInFormals`, `DefaultCharset` all flag Bad and leave Good clean. `StringSplitter` does **not** flag the rule's Bad (`return line.split(",")`): the checker only matches forms where it can build a fix (verified: `line.split(",")[0]`, assigned+used, and for-loop forms are flagged). `DoubleBraceInitialization` flags neither (expected — `anti-list-of-null` cites it for the null-hostile-factory tip, which the page states verbatim and suggests `Arrays.asList`).
5. **Structural.** 37/37 pass id/prefix/lang/baseline/keywords 2–8/source presence/heading order/exactly one `java` fence per Bad and Good/summary ≤30 words/no TODO/no bare ellipsis; all `related` ids and See Also links resolve; INDEX lists all 37 and has no orphans. One version mention, `"JDK 9"`, sits inside the `anti-list-of-null` source quote — precedent for quoted version references exists in verified rules (`doc-return`, `proj-internal-api`). No near-duplicates: max in-batch title+summary similarity 0.389 (`conv-objects-equals`/`conv-objects-to-string`), `sec-path-traversal`/`sec-zip-slip` 0.292, `anti-default-charset`/`io-charset-explicit` 0.261 — kept separate (in-memory `String` bytes↔text vs file boundaries; distinct sources, EP `DefaultCharset` vs JEP 400).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-data-transaction | verified | Connection quote verbatim; H2: auto-commit partial 90/100, rollback 100/100, commit 90/110 |
| java-data-batch | verified | addBatch quote verbatim; H2 executeBatch 3 updates / 3 rows |
| java-data-fetch-size | verified | setFetchSize quote verbatim; full scan works with fetch size set |
| java-data-next-exception | verified | getNextException + iterator quotes verbatim; chain walk sees both messages |
| java-data-generated-keys | verified | getGeneratedKeys quote verbatim; H2 returns identity keys (4, 5) |
| java-data-was-null | verified | wasNull quote verbatim; NULL → getInt 0 + wasNull true, real 0 → false |
| java-data-cancel | **rejected** | title/summary/symbols name `Statement.cancel`, but Good demonstrates `setQueryTimeout` and never calls `cancel`; fix below |
| java-net-httpclient-reuse | verified | both quotes verbatim (immutable client, pools not shared); shared-client probe works |
| java-net-httpclient-timeout | verified | Builder.timeout quote verbatim; 100 ms timeout → `HttpTimeoutException` |
| java-net-httpclient-async | verified | sendAsync quote verbatim; two 400 ms async calls completed in 426 ms |
| java-net-http-body-handlers | verified | doc example `sendAsync(request, BodyHandlers.ofString()).thenApply(HttpResponse::body)` present; both handlers exercised |
| java-net-httpclient-close | **rejected** | quoted `"closes this client"` is not on the page (JDK 21–25); `AutoCloseable`/`close()` are real — fix the quote |
| java-ffi-downcall | **rejected** | Good's `libraryLookup("c", Arena.global())` throws on JDK 23/macOS; cited Linker page uses `defaultLookup()`, which works |
| java-ffi-upcall | verified | Linker quote + upcallStub description supported; stub round-trip `triple(14) == 42` |
| java-ffi-symbol-lookup | verified | libraryLookup/find quotes supported; name/path lookup and empty-Optional missing symbol exercised (platform note) |
| java-ffi-memory-access | verified | MemorySegment quote supported; `JAVA_INT` round-trip vs byte-assembly differs on LE (`0x01020304` vs `0x04030201`) |
| java-sec-path-traversal | verified | normalize quote verbatim; escape rejected, normal name passes |
| java-sec-no-follow-links | **rejected** | Good's `toRealPath(NOFOLLOW_LINKS)` keeps an escaping symlink looking inside base; opening that path read outside data (probe) — inverted validation |
| java-sec-zip-slip | verified | ZipEntry/ZipFile quotes verbatim; probe: crafted entry escapes, Good throws, vulnerable extraction wrote outside (source-depth note) |
| java-sec-permissions | **rejected** | Good writes the secret first (probe: `rw-r--r--`) then chmods — exposure window contradicts the Why; atomic-creation fix verified |
| java-conv-objects-equals | verified | Objects.equals quote verbatim; null-safe behavior exercised |
| java-conv-objects-to-string | verified | Objects.toString quote verbatim; null/`null`-default exercised |
| java-conv-radix-parse | verified | parseInt(String,int) quote verbatim; `parseInt("ff",16)` works, `parseInt("ff")` NFE |
| java-conv-unsigned-parse | verified | parseUnsignedInt quotes verbatim; `"4294967295"` → -1 vs NFE |
| java-conv-list-to-array | verified | Collection.toArray(IntFunction) quote + doc example verbatim; generator form exercised |
| java-anti-list-of-null | verified | EP DoubleBraceInitialization tip verbatim incl. `Arrays.asList`; `List.of(null)` NPE vs `Arrays.asList` probe |
| java-anti-static-mutable | verified | Google §5.2.4 quotes verbatim (correct section); `Set.of()` immutable probe |
| java-anti-self-assignment | verified | EP page quote verbatim; EP flags Bad, Good clean; runtime no-op vs field set |
| java-anti-reference-equality | verified | EP page quote verbatim; EP flags Bad, Good clean; `==`/equals probe |
| java-anti-equals-incompatible | verified | EP page quote verbatim; EP flags Bad, Good clean; incompatible equals always false |
| java-anti-unused-variable | verified | EP page quote verbatim; EP flags Bad (`field 'title' is never read`), Good clean |
| java-anti-missing-enum-cases | verified | EP page quotes verbatim incl. `default: throw new AssertionError(color);`; EP flags Bad, Good clean |
| java-anti-string-splitter | verified | EP page quote verbatim; runtime 2 vs 4 trailing empties; EP flags indexed/assigned forms but not the shown bare `return` (note) |
| java-anti-self-comparison | verified | EP page quote verbatim; EP flags Bad, Good clean; self-compare is 0 |
| java-anti-primitive-varargs | verified | EP page quote verbatim; EP flags Bad, Good clean; `Arrays.asList(int[])` size 1 vs stream size 3 |
| java-anti-type-param-unused | verified | EP page quote verbatim; EP flags Bad, Good clean; `Class.cast` CCE probe |
| java-anti-default-charset | verified | EP page quote verbatim; EP flags Bad, Good clean; decode varies by `-Dfile.encoding`, explicit UTF-8 stable |

## Counts

- **verified: 32/37, rejected: 5**
- Compile: 74/74 snippets (javac 23.0.2, no preview). Behavior: 86/86 checks pass (61 general + 9 FFM + 16 JDBC; plus the 3-config charset probe). Error Prone: 9/11 cited checks cleanly separate Bad/Good; `StringSplitter` gating and `DoubleBraceInitialization` non-applicability noted above. Structural: 0 problems; no duplicates.
- 32 files were flipped `draft` → `verified`; the 5 rejected files remain `draft`; no other content was touched. INDEX `verified` counts left to the orchestrator (this batch adds 32).

## Blockers and follow-ups

- `java-data-cancel` (draft): the rule names `Statement.cancel` in its title, summary, triggers and symbols but its Good snippet only calls `setQueryTimeout(30)`; align one way or the other — either retitle/reword to `setQueryTimeout` (and move `Statement.setQueryTimeout` into symbols) or demonstrate `cancel()` from a supervising thread (both mechanisms verified working against H2).
- `java-net-httpclient-close` (draft): replace the invented quote `"closes this client"` with the page's actual `close()` text (`"Initiates an orderly shutdown in which requests previously submitted to send or sendAsync are run to completion, but no new request will be accepted"`); everything else (AutoCloseable, try-with-resources Good, close-after-use behavior) is verified.
- `java-ffi-downcall` (draft): the Good snippet does not run on macOS/JDK 23 — `SymbolLookup.libraryLookup("c", Arena.global())` throws `IllegalArgumentException: Cannot open library: c`. Use the cited Linker page's own pattern, `linker.defaultLookup().findOrThrow("strlen")`, or an explicit path; the downcall mechanism itself is verified (strlen → 5).
- `java-sec-no-follow-links` (draft): the Good guidance is inverted for validation. Probe: `base/link -> outside.txt`; `toRealPath(NOFOLLOW_LINKS)` returns the path inside base, `startsWith(base)` passes, and opening it reads `outside.txt`; `toRealPath()` (the Bad) returns the target and fails containment. Fix: follow the real path and check containment on it (or open with `NOFOLLOW_LINKS` and reject symlinks), and use the same resolved path for both the check and the access.
- `java-sec-permissions` (draft): the Good creates the secret with default permissions (`rw-r--r--` observed) and only then chmods, leaving the exact exposure window the Why describes. Create the file with `PosixFilePermissions.asFileAttribute(...)` at open time (verified working: `FileChannel.open(path, Set.of(CREATE_NEW, WRITE), asFileAttribute("rw-------"))` → `rw-------` from creation), or stage in a 0700 directory and move.
- Notes (no action required): `java-sec-zip-slip` — the two cited javadocs establish the API surface but not the traversal claim; behavior was demonstrated end-to-end, matching the sourcing bar used by verified `sec-temp-file`/`sec-path-traversal`; adding a CWE-22/CWE-29 primary source would strengthen it. `java-anti-string-splitter` — EP 2.50 `StringSplitter` only reports forms where it can build a fix, so the shown bare `return line.split(",")` is not flagged (equivalent forms are); rule text, source and runtime behavior are correct, and `enforce: tool` is accurate for the pattern class, but changing the Bad to index the result (e.g. `return line.split(",")[0];`) would make tool parity exact. `java-ffi-symbol-lookup` — the library name `"example"` is illustrative and name-form lookups are platform-specific (macOS `"c"` fails; a string path or `defaultLookup()` works); mechanism verified with a real library. `java-data-transaction` — Good leaves `autoCommit` false; acceptable for the snippet's ownership model, but pooled-connection callers should restore it. `java-net-http-body-handlers` — the Bad snippet does close its stream; the "missed close" rationale is generic rather than shown. `java-anti-list-of-null` — `"JDK 9"` appears inside the quoted Error Prone tip (version mention precedent exists in verified rules).

## Addendum — re-verification of the five fixes (2026-10-05)

The five rejected rules were revised by the author; each was re-checked from scratch (sources re-fetched/rematched, both snippets recompiled with `javac 23.0.2 -Xlint:all`, behavior re-probed, structural re-checked). Artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch11b/` (`fixcompile/` 10 snippets, `behavior/FixBehavior.java`, `FixFfi.java`, `FixJdbc.java`, `fixcheck.mjs`).

| rule id | verdict | re-check evidence |
|---|---|---|
| java-data-cancel | **verified** | `Statement.cancel` quote still verbatim; new Good calls `cancel()` via `scheduler.schedule(...)` and disarms in `finally`. Exact-snippet harness (H2): fast query returned 3 rows, deadline task scheduled once and `isCancelled() == true` after return; 250 ms-deadline variant aborted a running query (`SQLState 57014`, "Statement was canceled or the session timed out"). Title/summary/body now aligned. |
| java-net-httpclient-close | **verified** | New Why quote matches the JDK 23 page verbatim: "Initiates an orderly shutdown in which requests previously submitted to send or sendAsync are run to completion, but no new request will be accepted". Snippets unchanged; try-with-resources works and a closed client rejects new requests. |
| java-ffi-downcall | **verified** | Good now uses `linker.defaultLookup().find("strlen").orElseThrow()`, matching the cited Linker page's own `defaultLookup().findOrThrow("strlen")` example; runs on JDK 23/macOS: `strlen("hello") == 5`, `strlen("") == 0`. Compiles (only the expected `[restricted]` warning). |
| java-sec-no-follow-links | **verified** | Logic corrected and title/summary/keywords/symbols updated. Probe: Bad NOFOLLOW check accepts `base/link -> outside.txt` and opening it reads the outside data; Good `toRealPath()` + `startsWith(base.toRealPath())` rejects the escaping link, accepts an inside-resolving link, a normal file, and a symlinked base, and returns the real path to open. |
| java-sec-permissions | **verified** | Good creates with `Files.createFile(path, PosixFilePermissions.asFileAttribute("rw-------"))`; probe shows `rw-------` before any content is written and after `writeString`, with correct content. `createFile`/file-attribute quotes verbatim. |

- Compile: 10/10 recompiled. Structural: 5/5 pass; INDEX line for the retitled `sec-no-follow-links` is already updated ("Resolve links before checking a path against its base"). Quotes for the changed rules all match their cited pages.
- Non-blocking observations: `data-cancel` — if `cancel()` itself throws, the exception lands in the discarded scheduled future and is swallowed; acceptable for the example. `sec-permissions` — the Good is now create-only, so re-saving over an existing file throws `FileAlreadyExistsException`; updates should write a 0600 temp file and atomically move it (or set permissions on the existing file).
- **Final counts for the batch: verified 37/37, rejected 0.** All five re-verified files were flipped `draft` → `verified`; no other content was touched.
