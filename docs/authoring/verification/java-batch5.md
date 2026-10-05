# Java Batch 5 (`perf` + `io`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/perf-*.md` (12) and `io-*.md` (12) — 24 rules
- Toolchain: javac 23.0.2 (OpenJDK 23.0.2, Homebrew arm64); JMH 1.37 (`jmh-core-1.37.jar`, Maven Central, SHA-1 `896f27e49105b35ea1964319c83d12082e7a79ef`)
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-java-batch5-adv/` (`src/` fetched pages, `rules/` extracted snippets, `behavior/` drivers, `validator-java.json`)

## Method

1. Sources: fetched all 20 unique cited URLs (JMH project page, JEP 230, JEP 400 via webfetch; 17 Oracle API pages via curl, all HTTP 200) and matched 41 quoted passages against the saved pages. All match except three findings:
   - `perf-linkedlist-indexing`: quotes `get "runs in constant time"`; the page says the listed operations (including `get`) "run in constant time" — one-word quote drift, claim supported ("constant factor is low" is verbatim).
   - `io-atomic-move`: the quoted "the file as an atomic file system operation" is verbatim on `StandardCopyOption` (linked from the cited Files page as the definition of `ATOMIC_MOVE`); the cited Files page states "The move is performed as an atomic file system operation" — equivalent claim, attribution note.
   - `io-whole-file-text`: the quoted "intended for simple cases where it is convenient to read all bytes into a string" appears on neither the cited Files page nor any JDK 11–25 version (checked); `readString`'s actual API note is "intended for simple cases where it is appropriate and convenient to read the content of a file into a String", and the quoted wording conflates `readAllBytes`' "read all bytes into a byte array". → rejection.
2. Compile: extracted both snippets from all 24 rules (48 snippets) and compiled each independently with `javac 23.0.2 -Xlint:all`: **48/48 clean, zero warnings**. `perf-jmh-measure` Good compiled against `jmh-core-1.37.jar`. The deterministic validator reports that snippet as `compile-failed` only because it runs javac without the JMH classpath — environment limitation, not a rule defect.
3. Behavior: 23 rule-level drivers (46 variant runs) executed offline with timeouts; key results below.
4. Idiom/structure/links: section order, exactly one `java` fence per section, summaries ≤ 17 words, snippets ≤ 25 lines, no forbidden tokens/elisions, every `related` and See Also link resolves, no `enforce: tool` claims. Duplicates: max within-batch similarity 0.29 (`io-create-directories` ↔ `io-lines-stream`), max cross-pack 0.14; `perf-stream-side-effects` and `perf-stream-stateless` are distinct decisions (accumulation idiom vs stateful-lambda correctness) with distinct fixes.
5. Validator: `node dist/rules/cli.js validate --lang java --json` — batch 5 has exactly one error (JMH classpath, above) and two warnings (hedging "often" in `perf-stream-side-effects`, "might" in `perf-stream-stateless`); both hedge words sit inside doc quotes verified verbatim, non-blocking.

## Behavior evidence

- `perf-threadlocalrandom`: 8 threads × 1000 draws covered all 100 possible values, no errors (shared-Random control correct too; the documented difference is contention).
- `perf-longadder`: 8 threads × 100,000 increments → exactly 800,000.
- `perf-pattern-precompile`: classification correct and equal to `String.matches` on sample inputs.
- `perf-enum-set`, `perf-deque-over-stack`, `perf-stringbuilder-over-stringbuffer`, `perf-linkedlist-indexing`, `perf-parallel-stream-gate`: outputs correct for both variants.
- `perf-stream-side-effects`: Good collect = `[a, b, c]`; Bad parallel `forEach` threw `ArrayIndexOutOfBoundsException` in one trial and lost 101,410 / 79,243 elements in the other two (race reproduced).
- `perf-stream-stateless`: Good ranks ordered 1..3; Bad parallel stateful lambda scrambled 47/50 ranks.
- `perf-hashmap-capacity`: contents correct; `newHashMap(100)` pre-sets threshold 256 before first put vs 0 for the default constructor (no rehash for 100 entries).
- `io-charset-explicit`: Good round-trips UTF-8 text; Bad writes `C3 A9` under the UTF-8 default but `E9` under `-Dfile.encoding=ISO-8859-1` and `3F` under `-Dfile.encoding=COMPAT` + `LC_ALL=C` — JEP 400 hazard reproduced.
- `io-malformed-report`: Good decodes valid UTF-8 and throws `CharacterCodingException` on `C3 28`; Bad REPLACE silently yields U+FFFD.
- `io-no-available`: Good reads `payload` from a stream whose `available()` returns 0; Bad returns `""` (truncation reproduced).
- `io-transfer-to`: copy equals source, input at EOF, tracking streams confirm neither stream closed.
- `io-path-resolve`: Good handles plain, nested, and absolute keys (`/abs.cache`); Bad concatenation yields `/tmp/cache-dir/abs.cache`.
- `io-atomic-move`: `ATOMIC_MOVE` verified for fresh and overwrite moves (macOS rename semantics); `io-create-directories`: nested `a/b/c` created and repeat call idempotent, Bad throws `NoSuchFileException` on missing parents; `io-lines-stream` countErrors = 3; `io-directory-stream-close` count = 3; `io-buffered-streams` 100,000-byte round-trip; `io-whole-file-text` round-trip; `io-nio-over-file` exists before/after.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-perf-jmh-measure | verified | JMH page + JEP 230 quotes exact; both snippets compile (Good with jmh-core-1.37.jar) |
| java-perf-threadlocalrandom | verified | ThreadLocalRandom quote exact; 8×1000 draws cover all 100 values, no errors |
| java-perf-parallel-stream-gate | verified | stream summary quotes exact; pure-op sequential/parallel results equal |
| java-perf-stringbuilder-over-stringbuffer | verified | StringBuilder quote exact; build output correct |
| java-perf-deque-over-stack | verified | Deque quotes exact; LIFO order correct |
| java-perf-stream-side-effects | verified | quotes exact incl. "Unnecessary use of side-effects!"; Bad parallel forEach race reproduced |
| java-perf-longadder | verified | LongAdder quotes exact; 8×100k = 800,000 exactly |
| java-perf-hashmap-capacity | verified | HashMap quotes exact; newHashMap(100) threshold 256 vs default 0 |
| java-perf-pattern-precompile | verified | Pattern quote exact; results equal String.matches |
| java-perf-enum-set | verified | five EnumSet quotes exact; add/contains correct |
| java-perf-stream-stateless | verified | stream quotes exact (incl. "might"); Bad parallel stateful scrambled 47/50 |
| java-perf-linkedlist-indexing | verified | LinkedList quote exact; ArrayList "run in constant time" supports claim (note: quote has "runs") |
| java-io-path-resolve | verified | Path quotes exact; absolute key returns `/abs.cache` vs Bad concat |
| java-io-charset-explicit | verified | JEP 400 quotes exact; encoding hazard reproduced under ISO-8859-1/COMPAT |
| java-io-create-directories | verified | Files quotes exact; nested create idempotent; Bad NoSuchFileException |
| java-io-whole-file-text | **rejected** | quoted sentence absent from cited page and all JDK 11–25 docs; readString API note reads "appropriate and convenient to read the content of a file into a String"; fix quote only (snippets/behavior fine) |
| java-io-transfer-to | verified | InputStream quotes exact; EOF and no-close behavior confirmed |
| java-io-nio-over-file | verified | File quotes exact; exists before/after correct |
| java-io-no-available | verified | available() quote exact; Bad truncates to `""` when available()=0 |
| java-io-atomic-move | verified | cited page supports atomic-move definition + AtomicMoveNotSupportedException; quote wording verbatim on linked StandardCopyOption; fresh/overwrite moves pass |
| java-io-malformed-report | verified | CharsetDecoder quote exact; REPORT throws, REPLACE silent |
| java-io-buffered-streams | verified | BufferedOutputStream quote exact; round-trip passes |
| java-io-lines-stream | verified | Files.lines quotes exact; countErrors = 3 |
| java-io-directory-stream-close | verified | DirectoryStream quotes exact; count = 3 under try-with-resources |

## Counts

- **verified: 23/24, rejected: 1**
- Blocker: `java-io-whole-file-text` quote fidelity (replace the quoted text with the actual `readString` API note).
- Non-blocking notes: `perf-linkedlist-indexing` "runs" → "run"; `io-atomic-move` quote wording comes from the linked `StandardCopyOption` page (could be cited or aligned); validator cannot compile the JMH snippet without a classpath.

## Addendum — re-verification after fixes (2026-10-05)

Two findings from the verdict table were addressed by the author; both were re-checked independently:

1. `io-whole-file-text` — the Why now quotes the verbatim `Files` API note: "intended for simple cases where it is appropriate and convenient to read the content of a file into a String. It is not intended for reading very large files". The live Java 23 Files page was fetched again and the quoted text is present verbatim. Both snippets were re-extracted and recompiled with `javac 23.0.2 -Xlint:all`: 2/2 clean, zero warnings. Structure intact (one `java` fence per section, links unchanged). Status flipped to `verified`.
2. `perf-linkedlist-indexing` — quote corrected to "run in constant time", verbatim on the ArrayList page (along with "constant factor is low"). Both snippets recompiled 2/2 clean; status remains `verified`.

Final counts after fixes: **verified 24/24, rejected 0**.
