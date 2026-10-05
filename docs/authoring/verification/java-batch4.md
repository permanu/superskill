# Java Batch 4 (`sec` + `obs`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/sec-*.md` (12) and `obs-*.md` (12) — 24 rules
- Toolchain: javac 23.0.2 (OpenJDK, Homebrew arm64); JDK 23 runtime and `jfr` tool; H2 2.5.252 (Maven Central) for the JDBC behavior test
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-java-batch4/` (`docs/` fetched pages, `jars/`, `src/`, `classes/`, `run/`)

## Method

1. Sources: fetched all 19 unique cited URLs. Claim-level passages matched for every rule against the saved pages (SecureRandom, MessageDigest.isEqual, PBEKeySpec, Files, JDBC prepared statements, JEP 185/290/332/444, Serializable, java.net.http module summary, Logger/Level/System.Logger/Thread, Java Logging Overview, jfr Event/Label/Recording). Oracle's Secure Coding Guidelines (403) are not cited by any rule, so nothing depended on them. Two cited URLs were found broken and are the basis of two rejections:
   - `sec-password-char-array`: cited `.../23/docs/api/javax/crypto/spec/PBEKeySpec.html` redirects to `https://docs.oracle.com/en/java/javase/26/` (docs home, none of the quotes). The canonical URL `.../23/docs/api/java.base/javax/crypto/spec/PBEKeySpec.html` contains all three quotes verbatim.
   - `obs-jfr-event-metadata`: cited `.../23/docs/api/jdk/jfr/jdk/jfr/Event.html` (slash module) redirects to the docs home; canonical `.../23/docs/api/jdk.jfr/jdk/jfr/Event.html` contains "Base class for events…". The rule's Label.html URL is correct.
2. Compile: extracted both snippets from all 24 rules (48 snippets, all declaration-level, no `public` top-level types) and compiled each independently with `javac 23.0.2 -Xlint:all` without `--enable-preview`: **48/48 compiled**, zero warnings.
3. Behavior (all safe, self-contained, offline):
   - `sec-securerandom`: two SecureRandom outputs differ; `new Random(42)` reproduces its sequence exactly.
   - `sec-secure-random-reuse`: shared instance across 8 threads × 10k calls → 80,000 values, no errors; per-call construction yields distinct instances.
   - `sec-constant-time-equal`: isEqual/Arrays.equals semantics identical; timing probe on 1 MB arrays: `Arrays.equals` 0.1 ms (first-byte diff) vs 21.0 ms (last-byte diff) — content-dependent early exit; `MessageDigest.isEqual` 443.6 ms vs 374.0 ms (same order, no early exit).
   - `sec-password-char-array`: Good's clone survives caller mutation and `clear()` zeroes to NUL; a String holds "secret" — claims true, but rejected on the broken URL above.
   - `sec-temp-file`: `createTempFile` name `upload-13650232319923205019.tmp`, permissions `rw-------`; fixed `/tmp` path `rw-r--r--`. Files API also documents the returned path "did not exist before".
   - `sec-sql-prepared`: H2 in-memory, input `x' OR '1'='1` → Bad concatenation returns row `1`; Good PreparedStatement returns `null`.
   - `sec-xml-external-protocols`: **Good throws** `IllegalArgumentException: Property 'http://javax.xml.XMLConstants/property/accessExternalStylesheet' is not recognized.` at `DocumentBuilderFactoryImpl.setAttribute` (rejection below); DTD+SCHEMA only blocks XXE with `accessExternalDTD`.
   - `sec-xxe-doctype`: hardened factory blocks DOCTYPE (`SAXParseException`), default parser resolves the file entity (`TOPSECRET2`).
   - `sec-deserialization-filter`: unfiltered stream loads `demo.Session`; the Good filter rejects it with `InvalidClassException: filter status: REJECTED`.
   - `sec-deserialization-untrusted`: DataInputStream round-trip yields `UserSession[userId=alice, expiresAtEpochSecond=1700000000]`.
   - `sec-tls-verify`: default X509TrustManager has 112 accepted issuers (verification active); module summary confirms the hostname-verification switch is "provided for testing purposes only".
   - `sec-tls-version`: default protocols include TLSv1.3; `jdk.tls.disabledAlgorithms` includes TLSv1; `SSLContext.getInstance("TLSv1")` returns an uninitialized context.
   - `obs-log-lazy-supplier`: FINER disabled → 0 supplier calls; enabled → 1.
   - `obs-log-levels`: `fine()` suppressed at default INFO, delivered once FINE is enabled; `warning()` reaches handlers at default level.
   - `obs-log-throwable`: Bad record `getThrown()=null` (text only); Good record `getThrown()=RuntimeException`, SimpleFormatter renders the stack frame.
   - `obs-logger-names`: `com.example.payments` → parent `com.example` → root; generic `app` has no subtree.
   - `obs-logger-not-stdout`: Bad → 0 handler records, raw stdout; Good → 1 record, stdout empty.
   - `obs-system-logger`: `System.Logger` message arrived at a JUL handler attached to the same name (default backend routing).
   - `obs-jul-configuration`: no config → 0 "charging" lines; with `-Djava.util.logging.config.file=logging.properties` (`com.example.payments.level=FINE`) → `FINE: charging`.
   - `obs-name-threads`: unnamed virtual thread `getName()` = `""`; named = `"indexer"`. Quote is in the Thread API, not JEP 444 (rejection below).
   - `obs-jfr-custom-event`: `jfr print` shows `ImportEvent { file = "orders.csv", records = 42, stackTrace = Importer.run … }`.
   - `obs-jfr-should-commit`: `shouldCommit()` false before recording, true while recording; guarded `state="ready"` event present.
   - `obs-jfr-recording`: try-with-resources dump exists (114 KB), valid `jfr summary`.
   - `obs-jfr-event-metadata`: `jfr metadata` shows `@Label("Import")`, `@Label("Source file")`, `@Label("Record count")` — labels work, but rejected on the broken Event URL above.
4. Idiom: both snippets reviewed per rule — Good is principal-level current-LTS Java, Bad genuinely the claimed anti-pattern; no preview syntax (all compiles non-preview).
5. Structural/consistency: exact section order, one `java` fence per section, summaries ≤30 words (max 17), all `lang: java`, `baseline: latest`, no forbidden tokens/elisions. Max within-batch similarity 0.20–0.24; no cross-batch similarity >0.5. One dangling reference: `obs-name-threads` `related: [java-conc-vt-uncaught-handler]` and See Also `conc-vt-uncaught-handler.md` do not exist (actual rule: `java-err-vt-uncaught-handler`, `err-vt-uncaught-handler.md`).
6. Tool ids: no rule in this batch sets `enforce: tool`; no tool id required.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-sec-securerandom | verified | SecureRandom API quotes; SecureRandom outputs differ vs seeded Random reproduces |
| java-sec-secure-random-reuse | verified | API quotes (thread-safe, self-seeding, entropy blocking); 80k shared-instance calls no errors |
| java-sec-constant-time-equal | verified | isEqual implementation note verbatim; timing probe shows Arrays.equals early-exit (0.1 vs 21 ms), isEqual flat |
| java-sec-password-char-array | **rejected** | cited PBEKeySpec URL redirects to `javase/26/` docs home; canonical `.../java.base/javax/crypto/spec/PBEKeySpec.html` supports all quotes. Fix: add `java.base/` |
| java-sec-temp-file | verified | Files quotes incl. "did not exist before"; `rw-------` vs fixed-path `rw-r--r--` |
| java-sec-sql-prepared | verified | tutorial quotes; H2: Bad returns row `1`, Good returns `null` for `x' OR '1'='1` |
| java-sec-xml-external-protocols | **rejected** | Good throws `IllegalArgumentException` at runtime: DocumentBuilderFactory does not recognize `ACCESS_EXTERNAL_STYLESHEET` (XSLT-only per JEP 185); DTD+SCHEMA restriction works. Fix: drop the stylesheet line |
| java-sec-xxe-doctype | verified | JEP 185 feature names present; DOCTYPE blocked hardened vs entity resolved default |
| java-sec-deserialization-filter | verified | JEP 290 quotes; filter rejects non-allowlisted class (`filter status: REJECTED`), unfiltered loads it |
| java-sec-deserialization-untrusted | verified | Serializable warning quote; DataInputStream round-trip harness |
| java-sec-tls-verify | verified | module summary "provided for testing purposes only" (hostname verification); default trust manager 112 issuers |
| java-sec-tls-version | verified | JEP 332 quotes; default protocols TLSv1.3, TLSv1 in disabledAlgorithms |
| java-obs-log-lazy-supplier | verified | Logger API FINER example quotes; 0 calls disabled vs 1 enabled |
| java-obs-log-levels | verified | Level quotes (SEVERE/WARNING/INFO/FINE); fine suppressed at INFO, warning delivered |
| java-obs-log-throwable | verified | Logger "associated Throwable" + Overview "trouble sneezing" example; thrown=null vs RuntimeException + stack frame |
| java-obs-logger-names | verified | Logger/Overview naming quotes; hierarchy com.example.payments → com.example → root |
| java-obs-logger-not-stdout | verified | Overview control-flow quotes; handler records 0 vs 1, raw stdout vs empty |
| java-obs-system-logger | verified | System.Logger routing quote; message reached JUL handler |
| java-obs-jul-configuration | verified | Overview config-file quotes incl. java-home/conf/logging.properties; FINE enabled by config file only |
| java-obs-name-threads | **rejected** | quote "virtual threads do not have a thread name by default" is in the Thread API, not JEP 444 (JEP 444 contains no such sentence); also dangling `related`/See Also `java-conc-vt-uncaught-handler` (actual `java-err-vt-uncaught-handler`) |
| java-obs-jfr-custom-event | verified | Event API quotes; `jfr print` shows typed fields and stack trace |
| java-obs-jfr-event-metadata | **rejected** | cited Event.html URL uses `jdk/jfr` and redirects to docs home; canonical `jdk.jfr` URL needed. Labels otherwise verified in `jfr metadata` |
| java-obs-jfr-recording | verified | Recording API quotes; try-with-resources dump valid (`jfr summary`) |
| java-obs-jfr-should-commit | verified | Event shouldCommit quotes; false before recording, true while recording, guarded field recorded |

## Counts

- **verified: 20/24, rejected: 4**
- Compile: 48/48 snippets (javac 23.0.2, non-preview, no warnings). Behavior: 20 rule-level harnesses run; all reproduce the claimed outcomes except the two rejected behavior findings above.
- Duplicates: none (max within-batch 0.24, no cross-batch >0.5). Formatting/section/related checks pass except the dangling reference in `obs-name-threads`.

## Blockers and follow-ups

- `java-sec-password-char-array` (draft): change the PBEKeySpec URL to `https://docs.oracle.com/en/java/javase/23/docs/api/java.base/javax/crypto/spec/PBEKeySpec.html`; content then fully passes.
- `java-sec-xml-external-protocols` (draft): remove `factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "")` from Good (and the stylesheet mention in title/body); DocumentBuilderFactory supports only ACCESS_EXTERNAL_DTD/SCHEMA. Everything else passes.
- `java-obs-jfr-event-metadata` (draft): fix the Event.html URL to `.../api/jdk.jfr/jdk/jfr/Event.html`; labels verified working.
- `java-obs-name-threads` (draft): attribute the "virtual threads do not have a thread name by default" quote to the Thread API (or drop JEP 444), and point `related`/See Also at `java-err-vt-uncaught-handler` / `err-vt-uncaught-handler.md`.
- The other 20 files were flipped `draft` → `verified`; no other content was touched. INDEX/status counts left to the orchestrator.

## Addendum (2026-10-05)

- All four blockers fixed and re-verified, then flipped to `verified`: `sec-password-char-array` (canonical `java.base` PBEKeySpec URL, all quotes present), `sec-xml-external-protocols` (Good now DTD+SCHEMA only; runtime probe blocks XXE with `SAXParseException` citing `accessExternalDTD`, no `IllegalArgumentException`; title/Why aligned, no stylesheet mentions), `obs-name-threads` (quote attributed to the Thread API; `related`/See Also resolve to `java-err-vt-uncaught-handler`), `obs-jfr-event-metadata` (Event URL on the `jdk.jfr` module path resolves with quotes; `@Label` metadata still renders). All eight snippets recompiled clean. Final count: **verified 24/24, rejected 0** (expected INDEX count after orchestrator sync: 95 verified).
