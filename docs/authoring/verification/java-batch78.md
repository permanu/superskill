# Java Batches 7 + 8 (`gen` + `opt` + `num` + `coll`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/gen-*.md` (12), `opt-*.md` (12), `num-*.md` (12), `coll-*.md` (12) — 48 rules, all entered as `status: draft`; prior verification attempts died to an infrastructure limit, so this run re-verified from the current on-disk state (no statuses had been flipped)
- Toolchain: `javac 23.0.2` / `java 23.0.2` (OpenJDK, Homebrew); deterministic validator `node dist/rules/cli.js validate --lang java --json`
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/b78/` (`urls/` fetched pages + phrase checker, `src/` 96 extracted snippets, `out/` per-snippet compiles, `behav/` 71 drivers + 6 negative-compile probes, `probe*/`, `validator.json`, `compile_results.txt`)

## Method

1. Sources: fetched all 25 distinct cited URLs with `curl` (all HTTP 200: 7 Oracle tutorial pages, Java 23 API pages for SafeVarargs, SuppressWarnings, Optional, Objects, BigDecimal, Double, Math, Integer, Random, List, Map, Collection, ArrayList, PriorityQueue, LinkedHashMap, CopyOnWriteArrayList, HashSet, and the Google Java Style Guide). 115 quoted-phrase assertions checked case-insensitively against tag-stripped page text.
2. Compile: extracted both fenced snippets from all 48 rules (96 snippets) and compiled each independently with `javac 23.0.2 -Xlint:all -proc:none -d <scratch>`: **96/96 exit 0**.
3. Behavior: 71 drivers compiled and run against the extracted snippet classes (with timeouts), covering every behavior claim: wildcard/PECS probes, Optional chains, requireNonNull, BigDecimal valueOf/equals/divide/scale, overflow/wrap, floorMod, toIntExact, NaN, double compare/equality, boxed identity, computeIfAbsent/merge/getOrDefault, removeIf, PriorityQueue, LinkedHashMap order, COW, subList view, first/last, Set membership. Six negative-compile probes verify the documented compile-time failures.
4. Idiom/structure/links: scripted audit of all 48 files (frontmatter, section order, exactly one `java` fence per Bad/Good, summary length, anti-slop markers, snippet length, `related` and See Also resolution, duplicate titles/summaries, version numbers, preview features) plus a summary-similarity (Jaccard) near-duplicate scan across the Java pack.
5. Validator: `validate --lang java --json` — **0 errors, 0 warnings** for the batch-7/8 files (the 75 pack-level errors all belong to other prefixes: module-info/JMH snippets, two `index-extra` entries, etc.).

## Source findings

All rule claims are supported by the cited pages. Representative confirmations:

- Tutorials: "Stronger type checks at compile time" / "Elimination of casts"; "bounded type parameters allow you to invoke methods defined in the bounds"; "replace the type arguments required to invoke the constructor … with an empty set of type parameters"; "Raw types bypass generic type checks"; the two unbounded-wildcard scenarios; "An 'in' variable … upper bounded wildcard … An 'out' variable … lower bounded wildcard … do not use a wildcard"; "do not apply to a method's return type … forces programmers using the code to deal with wildcards"; "You cannot create arrays of parameterized types"; "use an unbounded wildcard to verify that the list is an ArrayList … instanceof requires a reifiable type".
- SafeVarargs: "a programmer assertion that the body … does not perform potentially unsafe operations on its varargs parameter"; suppresses non-reifiable-vararg and parameterized-array-creation warnings. SuppressWarnings: "most deeply nested element where it is effective … annotate that method rather than its class".
- Optional: "A variable whose type is Optional should never itself be null"; "primarily intended for use as a method return type … 'no result'"; of/ofNullable/orElse/orElseGet/orElseThrow/get-note/ifPresentOrElse/map-null/flatMap/stream/or/filter sentences all present.
- Objects: "checks that the specified object reference is not null … designed primarily for doing parameter validation".
- BigDecimal: "somewhat unpredictable", the 0.1000000000000000055511151231257827021181583404541015625 expansion, "canonical string representation provided by the Double.toString(double) method", "equal only if they are equal in value and scale … 2.0 is not equal to 2.00", "infinitely long decimal expansion … ArithmeticException", "immutable, arbitrary-precision signed decimal numbers"; `ROUND_*` constants "Use RoundingMode.CEILING instead".
- Double/Math/Integer/Random: representation-hazard/monetary sentence, 10×0.1 example, total-order/-0.0/NaN sentences; Exact-method overflow sentence; floorMod "same sign as the divisor y"; toIntExact overflow sentence; `-128 to 127` valueOf cache; nextInt bound uniformity/rejection.
- Collections: List.of/copyOf unmodifiable + null rejection + "costly linear searches" + getFirst/getLast; Map mutable-key warning, computeIfAbsent/merge/getOrDefault sentences, Map.of duplicate/null characteristics; Collection removeIf default implementation and view-collection sentences; ArrayList fail-fast; PriorityQueue heap/O(log n); LinkedHashMap chaotic-ordering and copy-order sentences; CopyOnWriteArrayList fresh-copy/snapshot-iterator sentences; HashSet constant-time sentence.
- Google style 5.2.8 type-variable naming (E/T/T2 vs RequestT/FooBarT).

Typographic/condensation notes (all meaning-identical, none blocking): the tutorial page uses double quotes where `gen-wildcard-pecs` uses single quotes around "in"/"out"; three Optional quotes are condensed ("If a value is present, returns the value, otherwise returns other" → "returns the value, if present, otherwise returns other"; likewise orElseGet; "(as if by ofNullable(T))" → "(as if by ofNullable)").

## Compile results

`javac 23.0.2 -Xlint:all`: **96/96 snippets exit 0**. Three Bad snippets emit exactly the diagnostics their rules describe:

- `gen-bounded-type-params` Bad: `[unchecked] unchecked call to compareTo(T) as a member of the raw type Comparable` — the unchecked call the rule removes.
- `gen-raw-types` Bad: `[rawtypes]` ×2 + `[unchecked] unchecked call to add(E)` — the bypassed generic checks.
- `gen-safevarargs` Bad: `[unchecked] Possible heap pollution from parameterized vararg type T` — the declaration warning `@SafeVarargs` suppresses.
- `gen-safevarargs` Good retains one `[varargs]` pass-through lint warning at `List.of(elements)` (the `[unchecked]` declaration warning is gone). The body passes the array to `List.of`, which copies; no leak, so the `@SafeVarargs` assertion is justified. Non-blocking.

## Behavior evidence (71 cases, 70 pass)

- gen: raw `Stack`/raw `List` → `ClassCastException`; Good generics return typed values; `Max.max` with Comparable types; PECS `total(List<? extends Number>)` accepts `List<Integer>`/`List<Double>` (Bad signature rejects `List<Integer>`: "incompatible types: List<Integer> cannot be converted to List<Number>"); `List<? extends Number>` return rejects `add` ("int cannot be converted to CAP#1"); `instanceof List<?>` pattern works on lists, false otherwise; `@SafeVarargs` factory works; nested-list buckets work; `List<Integer>` not assignable to `List<Object>`.
- opt: null-returning `find` → NPE on `.orElse`, Good empty; `Optional.of(null)` → NPE, `ofNullable` → empty; `orElse(count())` evaluates eagerly (counter 1), `orElseGet` lazy (counter 0 then 1); `orElseThrow` custom `IllegalStateException("theme not configured")`; `ifPresentOrElse` prints both branches; `map` turns null name into empty; `flatMap(Optional::stream)` yields `[a, c]`; `or()` chain p→s→default; Bad `map(this::primary)` is `Optional<Optional<String>>` (negative compile), Good `flatMap` returns `Optional<String>`; `filter("admin"::equals)`; `requireNonNull` returns value and NPE message "name".
- num: `new BigDecimal(0.1)` = 0.1000000000000000055511151231257827021181583404541015625 vs `valueOf(0.1)` = "0.1"; `2.0.equals(2.00)` false, `compareTo == 0`; `divide(3)` → ArithmeticException, with scale 2/HALF_UP → 0.33; `3 × 0.1` = 0.30000000000000004 vs BigDecimal 0.3; `MAX+1` wraps to `MIN` vs `addExact` throws; `-1 % 7` = -1 vs `floorMod(-1,7)` = 6; `(int)(1L<<32)` = 0 vs `toIntExact` throws; 10×0.1 != 1.0 vs tolerance true; `(int)(a-b)` comparator reports distinct 1e-11/2e-11 equal and has no answer for NaN, `Double.compare` total order + sort; `NaN == NaN` false, `isNaN` true; `nextInt(6)` in range, `nextInt(0)` throws; `1000 == 1000` false / `100 == 100` true (cache) vs `equals`.
- coll: `List.of` unmodifiable/null-rejecting, `Set.of` duplicate-rejecting, `Map.of` null/duplicate probes; mutated `StringBuilder` key — see rejection below; computeIfAbsent groups `{a=[apple, avocado], b=[banana]}`; merge counts `{a=3, b=1}`; getOrDefault dark/light; for-each remove → CME (and with two cancelled elements it silently leaves one); removeIf `[keep]`; PriorityQueue polls `abc`; LinkedHashMap copy preserves `[b, a, c]` while HashMap copy gives `[a, b, c]`; ArrayList listener self-registration → CME vs COW no CME and later fire sees it; subList view reflects backing changes vs `List.copyOf` detached; `getFirst` on empty → `NoSuchElementException` vs `get(0)` → `IndexOutOfBoundsException`; Set membership; List admits duplicates.

Negative compiles (all fail for the documented reason): PECS (`List<Integer> → List<Number>`), wildcard return (`add` on capture), `instanceof List<String>` ("Object cannot be safely cast to List<String>"), `new List<String>[1]` ("generic array creation"), `Max.max(new Object(), new Object())` ("method max … cannot be applied"), Bad `lookup` (`Optional<Optional<String>> cannot be converted to Optional<String>`). Also: `@SafeVarargs` on a non-final instance method → "Invalid SafeVarargs annotation. Instance method … is neither final nor private."

## Structural / idiom / duplicates / links

- 48/48 files: frontmatter valid (`baseline: latest`, `enforce: review`, no `tool`/`compile_exempt`), exact section order Why/Bad/Good/See Also, exactly one `java` fence per Bad/Good, summaries ≤ 30 words, snippets ≤ 25 lines, no TODO/elision/unicode-ellipsis/version-number/preview markers.
- All `related` IDs and See Also links resolve; no duplicate titles or summaries; no near-duplicate pair (summary Jaccard ≥ 0.5) involving batch-7/8 rules; the adjacent pairs (`map-null`/`flatmap`, `compute-absent`/`merge`/`get-or-default`, the three wildcard rules, the four BigDecimal rules) are distinct decisions.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-gen-generic-parameters | verified | why.html quotes exact; raw Stack → CCE, `Stack<String>` typed; 2/2 compile |
| java-gen-bounded-type-params | verified | bounded.html quote exact; Bad emits [unchecked] raw Comparable; Object args rejected; Good compiles |
| java-gen-diamond-inference | verified | inference quote exact; both compile; behavior trivial |
| java-gen-raw-types | verified | rawTypes quote exact; Bad [rawtypes]+[unchecked]; raw element → CCE on cast |
| java-gen-unbounded-wildcard | verified | two scenario quotes exact; `List<Integer>`/`List<String>` accepted; `List<Integer>` → `List<Object>` rejected |
| java-gen-wildcard-pecs | verified | guideline quotes exact; Good accepts `List<Integer>`; Bad rejects it (negative compile) |
| java-gen-wildcard-return | verified | "return type should be avoided" quote exact; Bad return rejects `add` (CAP#1), Good usable |
| java-gen-instanceof-wildcard | **rejected** | Why "A raw test compiles with warnings" is false: `javac 23 -Xlint:all` emits zero diagnostics for the Bad raw instanceof/cast. Reifiable rule itself is source-backed; parameterized test probe fails correctly. Fix: drop "with warnings" |
| java-gen-safevarargs | verified | SafeVarargs quotes exact; Bad [unchecked] heap-pollution warning; Good suppresses it; static/final/private requirement confirmed |
| java-gen-no-parameterized-arrays | verified | restrictions quote exact; Bad compiles under suppression; `new List<String>[1]` → "generic array creation"; Good nested lists work |
| java-gen-suppress-scope | verified | SuppressWarnings quotes exact; class-level annotation silences the unchecked cast, field-level scopes it |
| java-gen-type-param-names | verified | Google 5.2.8 quote exact; both compile |
| java-opt-never-null | verified | Optional API-note quote exact; Bad `find` → NPE on chain, Good `Optional.empty` |
| java-opt-return-type-only | verified | "primarily intended for use as a method return type" quote exact; Good accessor works |
| java-opt-of-nullable | verified | of/ofNullable sentences exact; `of(null)` → NPE, `ofNullable(null)` → empty |
| java-opt-or-else-get | verified | orElse/orElseGet sentences exact; eager vs lazy fallback reproduced with a counter |
| java-opt-or-else-throw | verified | get API-note + orElseThrow(Supplier) quotes exact; custom exception message preserved |
| java-opt-if-present-else | verified | ifPresentOrElse quotes exact; both branches print |
| java-opt-map-null | verified | map null→empty sentence exact; null user/name → empty, present name → value |
| java-opt-stream | verified | stream API-note/example quotes exact; `[a, c]` |
| java-opt-or-chain | verified | or sentence exact; p→s→default chain |
| java-opt-flatmap | verified | flatMap quote exact; Bad is `Optional<Optional<String>>` (negative compile), Good not nested |
| java-opt-filter | verified | filter sentence exact; admin/user/empty cases |
| java-opt-require-non-null | verified | Objects quotes exact; returns value, NPE message "name" |
| java-num-bigdecimal-valueof | verified | constructor warning + canonical-string quote exact; "0.1" vs 55-digit expansion |
| java-num-bigdecimal-equals | verified | equals/cohort sentences exact; `2.0` vs `2.00` equals=false, compareTo=0 |
| java-num-bigdecimal-divide | verified | nonterminating-quotient quote exact; ArithmeticException vs 0.33; deprecated ROUND_* confirmed |
| java-num-bigdecimal-money | verified | Double monetary hazard + BigDecimal quotes exact; 0.30000000000000004 vs exact 0.3 |
| java-num-overflow-exact | verified | Math Exact sentence exact; wrap vs ArithmeticException |
| java-num-floor-mod | verified | "same sign as the divisor" quote exact; -1 vs 6 |
| java-num-to-int-exact | verified | toIntExact sentence exact; 1L<<32 → 0 vs throw |
| java-num-double-equality | verified | 10×0.1 quote exact; != 1.0 vs tolerance |
| java-num-double-compare | verified | total-order/-0.0/NaN sentences exact; truncated comparator false-equal, Double.compare sorts |
| java-num-nan-test | verified | NaN reflexivity quote exact; `==` never fires, isNaN true |
| java-num-random-bound | verified | nextInt uniformity/rejection sentences exact; range 1..6, bound validation |
| java-num-boxed-identity | verified | valueOf cache quote exact; 1000 false / 100 true vs equals |
| java-coll-immutable-factory | verified | List.of/copyOf + Map.of characteristics quotes exact; unmodifiable/null/duplicate probes |
| java-coll-immutable-elements | **rejected** | Bad cannot exhibit the documented failure: `StringBuilder.hashCode` is identity-based (hash 1836019240 before/after mutation), lookup still succeeds, entry size 1. With a content-hashed key (ArrayList) hash 128→4066 and lookup misses. Fix: use a content-hashed mutable key or rewrite the example |
| java-coll-map-compute-absent | verified | computeIfAbsent sentence exact; grouping `{a=[apple, avocado], b=[banana]}` |
| java-coll-map-merge | **rejected** | Why "mishandles the null-mapped case" is false: probe shows manual `get`+ternary+`put` and `merge` produce identical results for absent and null-mapped keys (`{k=1}` both). Fix: drop/reword the clause |
| java-coll-map-get-or-default | verified | getOrDefault sentence exact; dark/light |
| java-coll-remove-if | verified | removeIf + ArrayList fail-fast quotes exact; CME reproduced (3 elements) and silent skip shown (2 cancelled) |
| java-coll-priority-queue | verified | heap/O(log n) quotes exact; poll order `abc` |
| java-coll-linked-map-order | verified | chaotic-ordering + copy-order quotes exact; `[b, a, c]` preserved, HashMap copy `[a, b, c]` |
| java-coll-copy-on-write | verified | fresh-copy/snapshot sentences exact; ArrayList → CME, COW survives self-registration |
| java-coll-sub-list-view | verified | view-collection + copyOf quotes exact; view reflects backing change, copy detached |
| java-coll-first-last | verified | getFirst/getLast sentences exact; empty → NoSuchElementException vs get(0) → IndexOutOfBoundsException |
| java-coll-set-membership | verified | HashSet constant-time + List linear-search quotes exact; membership answers correct |

## Counts

- **verified: 45/48, rejected: 3**
- Status flips applied: 45 files changed `draft` → `verified`; `gen-instanceof-wildcard.md`, `coll-immutable-elements.md`, `coll-map-merge.md` left `draft`. No other edits; no git.

## Blockers / follow-ups for authors

1. `java-coll-immutable-elements`: replace the `StringBuilder` key example with a content-hashed mutable key (e.g., an `ArrayList`/mutable POJO) so the Bad reproduces the miss, or rewrite the Why to the identity-equality hazard.
2. `java-gen-instanceof-wildcard`: delete "with warnings" from the Why (raw `instanceof`/cast is not linted); the rest is sound.
3. `java-coll-map-merge`: delete "and mishandles the null-mapped case" (or restate it as an error-proneness example); the merge guidance is sound.

Non-blocking: `gen-safevarargs` Good keeps a `[varargs]` pass-through lint warning under `-Xlint:all` (safe, copies via `List.of`); three Optional quotes are faithful condensations of the API text; `INDEX.md` still reads `verified: 143` and is owned by the index updater (outside this verifier's ownership).

## Addendum — re-verification of the three fixed rules (2026-10-05)

Scope: `coll-immutable-elements`, `gen-instanceof-wildcard`, `coll-map-merge`; re-checked from the current on-disk state (all three entered `status: draft`). Toolchain unchanged (`javac 23.0.2 -Xlint:all`); scratch `b78/reverify3/`.

Method: re-read each rule; recompiled both snippets per rule (6/6 clean); ran targeted drivers against the revised snippet classes; re-fetched the supporting API pages and re-checked the quoted claims; re-ran the structural audit for the three files (0 problems, 0 warnings).

- **`coll-immutable-elements` — verified.** Bad now keys on `List<String>` (ArrayList): the driver shows the hash changes on `rename` (`set(0, next)`), the entry stays in the table (`size=1`), and `get`/`containsKey` with the mutated key miss; Good String keys count `{a=2, b=1}`. The new "content-hashed key changes its hashCode" sentence reproduces; the Map mutable-key quote is unchanged and exact; 2/2 compile clean. Flip applied.
- **`gen-instanceof-wildcard` — verified.** "compiles with warnings" removed; the replacement sentence is accurate: the raw test compiles silently (0 diagnostics under `-Xlint:all`), checks only the erased class, and the parameterized test is rejected (`instanceof List<String>` → "Object cannot be safely cast to List<String>"); wildcard-pattern behavior confirmed; 2/2 compile clean. Flip applied.
- **`coll-map-merge` — rejected (citation only).** The concurrency rationale is correct and reproduced: 8 threads × 200,000 increments on a `ConcurrentHashMap` — the manual get/put Bad lost 1,213,173 of 1,600,000 increments; the `merge` Good counted exactly 1,600,000; both snippets compile clean. Blocking issue: the Why quotes ConcurrentMap ("provides thread safety and atomicity guarantees") and asserts "merge performs the whole combine atomically", but the only cited source (Map API) contains 0 occurrences of "thread safety" and states only that implementations "must document whether the remapping function is applied once atomically" — it does not state the guarantee. The supporting primary sources exist but are not listed: ConcurrentMap ("A Map providing thread safety and atomicity guarantees") and ConcurrentHashMap ("The entire method invocation is performed atomically"). Fix: add the ConcurrentHashMap API URL (and/or the ConcurrentMap API URL) to `sources` and re-verify. Left `status: draft`.

Addendum counts: re-checked 3, verified 2, rejected 1 (citation only). Batch-7/8 totals now: **verified 47/48, rejected 1** (`coll-map-merge`, pending the source-URL addition).

- **Follow-up (2026-10-05): `coll-map-merge` — verified.** ConcurrentMap + ConcurrentHashMap API URLs added to `sources` (and sources.md 164–165) and quoted in the Why; race re-confirmed (manual get/put lost 1,035,247 of 1,600,000, `merge` exact), 2/2 compile clean, structure clean; flipped. **Final batch-7/8 count: verified 48/48, rejected 0.**
