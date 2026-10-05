# Verification Report - TypeScript Batch 9 (`io`, `num`, `pat`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 9 `io-*.md` + 9 `num-*.md` + 8 `pat-*.md` (26 files, all entered as `status: draft`)
- Toolchain: Node.js v26.8.1; TypeScript 5.9.3 (`node node_modules/typescript/bin/tsc`); no browser probes required
- Compile command (exact harness): `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode` (fetched pages, strip/dup scripts, probe script)

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; treated every rule as unverified until each check passed.
2. Fetched all 24 distinct cited URLs (Node Reading files / Backpressuring / Path / Stream / File system; MDN TextDecoder, URLSearchParams, Numbers and dates, EPSILON, Math.round, Number.isNaN, NaN, Number.isSafeInteger, Bitwise operators, Exponentiation, Division, parseInt, Number, Map, Array.filter, Array.reduce, Iteration protocols; TS Handbook Narrowing, Iterators and Generators). All returned HTTP 200; pages converted to text and grepped for claim-specific passages.
3. Ran the repo validator (`dist/rules/validate.js`, same flags as `src/rules/harness/typescript.ts`) over all 26 files: 0 errors, 0 warnings, 52/52 snippets compile.
4. Probed runtime-observable decisions in Node v26.8.1: TextDecoder vs `String(bytes)`, URLSearchParams encoding, `for await` over an async iterable, custom `Symbol.iterator` (spread/`Array.from`), generator laziness, filter vs splice skip bug, `reduce` initial value / empty-array TypeError, EPSILON example and tolerance, global `isNaN` vs `Number.isNaN`, safe-integer collision at 2^53, `| 0` wrap vs `Math.trunc`, `**` vs `Math.pow` (BigInt), division by zero, parseInt vs Number, iterator `return()` cleanup on early exit, Map `for...of`. 34/34 probe assertions passed.
5. Mechanical checks: See Also link resolution, `related` id resolution (validator), INDEX.md coverage, version-number scan, hedging/anti-slop scan (validator warnings), summary word counts, duplicate-title check, token-Jaccard near-duplicate scan within the batch and against the whole 219-rule TypeScript pack.
6. Flipped `status: draft` -> `status: verified` for all 26 rules; re-validated the batch after the flips (0 issues, 52/52 compile). No other edits.

## Source evidence (claim-specific)

- `io-stream-chunks`: Node Reading files - `fs.createReadStream` + `for await (const chunk of readStream)` example; whole-file reads hold "memory before returning the data ... big files are going to have a major impact on your memory consumption and speed of execution".
- `io-backpressure`: Node Backpressuring - "In any scenario where the data buffer has exceeded the highWaterMark ... `.write()` will return false"; "Never call `.write()` after it returns false but wait for 'drain' instead".
- `io-text-decode`: MDN TextDecoder - "A decoder takes an array of bytes as input and returns a JavaScript string"; constructor takes a specific text encoding. Probe: `String(new Uint8Array([104,105]))` -> `"104,105"` vs `new TextDecoder("utf-8").decode(...)` -> `"hi"`.
- `io-path-join`: Node Path - `path.join()` "joins all given path segments together using the platform-specific separator as a delimiter, then normalizes the resulting path". Probe: `join("a","b")` -> `"a/b"`.
- `io-url-encode`: MDN URLSearchParams - "URLSearchParams objects percent-encode anything in the application/x-www-form-urlencoded percent-encode set"; `set()` documented. Probe: `url.searchParams.set("q","a b&c#d")` -> `...?q=a+b%26c%23d`; interpolation leaves the raw structure-breaking value.
- `io-pipeline`: Node Stream - `stream.pipeline` "forwarding errors and properly cleaning up"; `readable.pipe` caveat: "if the Readable stream emits an error during processing, the Writable destination is not closed automatically ... necessary to manually close each stream in order to prevent memory leaks".
- `io-mkdir-recursive`: Node File system - "If recursive is false and the directory exists, an EEXIST error occurs"; `mkdir('./tmp/a/apple', { recursive: true })` example.
- `io-write-exclusive`: Node File system - `open('myfile','wx')` example with `err.code === 'EEXIST'` ("myfile already exists").
- `io-no-exists-check`: Node File system - "Using fs.exists() to check for the existence of a file before calling fs.open(), fs.readFile(), or fs.writeFile() is not recommended. Doing so introduces a race condition".
- `num-money-minor-units`: MDN Numbers and dates - numbers are "double-precision 64-bit binary format IEEE 754"; MDN EPSILON - `Math.abs(0.2 - 0.3 + 0.1)` -> `2.7755575615628914e-17` (not zero). Probe confirms.
- `num-round-minor-units`: MDN Math.round - "returns the value of a number rounded to the nearest integer". Probe: `0.29 * 100` -> `28.999999999999996`; `Math.round` -> `29`.
- `num-epsilon-compare`: MDN EPSILON - exact magnitude-scaled guidance: "Number.EPSILON is inappropriate for any arithmetic operating on a larger magnitude ... a multiplier such as 2000 * Number.EPSILON creates enough tolerance"; page example `equal(x, y, 2000 * Number.EPSILON)`. Probe: `same(0.1+0.2, 0.3)` -> true.
- `num-nan-test`: MDN Number.isNaN - "The global isNaN() coerces ..."; MDN NaN - `isNaN` returns true for values that are or become NaN. Probe: `isNaN("abc")` -> true, `Number.isNaN("abc")` -> false, `Number.isNaN(NaN)` -> true.
- `num-safe-integer`: MDN Number.isSafeInteger - "The safe integers consist of all integers from -(2^53 - 1) to 2^53 - 1, inclusive". Probe: `2^53 === 2^53 + 1` is true; `isSafeInteger(2^53)` false.
- `num-bitwise-32`: MDN Bitwise operators - "Bitwise operators treat their operands as a set of 32 bits (zeros and ones)". Probe: `(2**31)|0` -> `-2147483648` (sign flip) vs `Math.trunc(2**31)` -> `2147483648`.
- `num-exponent-operator`: MDN Exponentiation - "It is equivalent to Math.pow(), except it also accepts BigInts as operands". Probe: `2n ** 10n` -> `1024n`; `Math.pow(2n, 10n)` throws TypeError.
- `num-division-zero`: MDN Division - `2 / 0` -> `Infinity`; `5 / "foo"` -> `NaN`; number division by zero returns Infinity or -Infinity (BigInt throws). Probe: `1/0` -> Infinity, `0/0` -> NaN, `avg([])` -> NaN. (The literal `0/0` example is not printed on the cited pages; standard IEEE-754 behavior, probe-confirmed.)
- `num-parseint-decimal`: MDN parseInt - `parseInt("15.99")` "stops at the decimal point"; "the return value will always be an integer"; MDN Number - "Number(value) converts a string or other value to the Number type. If the value can't be converted, it returns NaN". Probes: `parseInt("19.99")` -> 19, `parseInt("19.99abc")` -> 19, `Number("19.99")` -> 19.99, `Number("19.99abc")` -> NaN.
- `pat-assertion-function`: TS Handbook Narrowing - "Types can also be narrowed using Assertion functions"; `asserts` signature documented. Good snippet compiling under `--strict` proves the narrowing (unchecked `user.id` access after the assert).
- `pat-type-predicate`: TS Handbook Narrowing - "To define a user-defined type guard, we simply need to define a function whose return type is a type predicate"; `pet is Fish` example.
- `pat-custom-iterable`: MDN Iteration protocols - "In order to be iterable, an object must implement the [Symbol.iterator]() method"; TS Handbook Iterators - "An object is deemed iterable if it has an implementation for the Symbol.iterator property". Probe: spread/`Array.from` over the class -> `["x","y","z"]`.
- `pat-generator-lazy`: MDN Iteration protocols - "This function can be an ordinary function, or it can be a generator function, so that when invoked, an iterator object is returned. Inside of this generator function, each entry can be provided by using yield." Probe: taking 2 values from `squares(1000)` executed exactly 2 computations. See note below on the TS citation.
- `pat-for-of-map`: MDN Map - `for...of` "returns a 2-member array of [key, value] for each iteration. Iteration happens in insertion order". Probe: destructured entries with `break` -> `a:1;b:2`.
- `pat-filter-not-splice`: MDN Array.filter - "creates a shallow copy ... filtered down to just the elements ... that pass the test". Probe: the splice loop leaves `["cd","efg"]` (skipped `"cd"`), filter returns `["efg"]` without mutating input.
- `pat-iterator-consumer`: MDN Iteration protocols - `return()` "can perform any cleanup actions"; "When built-in language features call return() for cleanup, value is always undefined". Probe: `for...of` with `break` invoked the custom iterator's `return()`; manual `next()` does not.
- `pat-reduce-initial-value`: MDN Array.reduce - without an initial value "the array element at index 0 is used as the initial value"; "TypeError Thrown if the array contains no elements and initialValue is not provided". Probe: `[].reduce(add)` -> TypeError; `[1,2,3].reduce(add, 0)` -> 6.

## Notes on flagged items

- `num-nan-test`: the Bad's `isNaN(value as number)` cast is acceptable. Under `--strict`, global `isNaN` requires a number argument, and the cast is what lets the anti-pattern (coercing `unknown` through global `isNaN`) compile. The rule's point - global `isNaN` accepts anything - is preserved and probe-confirmed.
- `io-path-join`: the `@ts-expect-error: resolved at runtime by Node` on the `node:path` import follows the established pack convention (11 other TypeScript rules use it: `mod-*`, `type-no-ts-ignore`). The harness temp dir has no `@types/node`, so the import is intentionally suppressed; compile passes.
- `num-epsilon-compare`: the magnitude-scaled tolerance is not just acceptable, it is what MDN's EPSILON page itself recommends for values away from magnitude 1 (`2000 * Number.EPSILON` example).
- `pat-assertion-function`: snippets are longer than usual by design (two duplicated checks in Bad, two call sites in Good); both are 20 lines, under the 25-line target, and the validator reports no warnings.

## Other findings (non-blocking)

- `pat-generator-lazy` citation hygiene: the TS Handbook page at `handbook/iterators-and-generators.html` no longer documents generators at all (fetched twice on 2026-10-05; page "Last updated: Sep 28, 2026"; sections are Iterables / Iterable interface / for...of / for..of vs. for..in / Code generation; zero occurrences of `function*` or `yield`). The rule's generator claims rest on the MDN Iteration protocols source (generator functions return iterators; entries provided via `yield`), which is accurate and probe-confirmed. Recommend swapping the TS source for the MDN `function*` page in a future cleanup; not a blocker.
- `io-backpressure`: Node's native `Writable` exposes a `'drain'` event, not a `drain()` method. The Good snippet's `writer.drain()` is declared by its own `openWriter()` type (consistent with the pack's declaration-level convention, e.g. `io-pipeline`'s local `pipeline`), and the decision (wait when `write` returns false) matches the source. Note only.
- `io-no-exists-check` Good catches all read errors and returns `undefined`, matching the Bad's behavior for missing files; a production version could rethrow non-ENOENT errors. The rule's decision (do not check-then-read) is unaffected. Note only.
- `pat-for-of-map` and `pat-filter-not-splice` Why clauses about `forEach` (no `break`/`await`) and splice index shifting are standard semantics not printed on the cited pages; both are probe-confirmed. Notes only.

## Compile results

- 52/52 snippets pass the exact harness command (26 rules x Bad/Good), TypeScript 5.9.3, zero diagnostics (repo validator; all `bad:ok good:ok`).
- Post-flip re-validation of the 26 files: 0 errors, 0 warnings, 52/52 compile.

## Behavior probe results (bounded)

- Node v26.8.1, 34/34 assertions: TextDecoder `"hi"` vs `String(bytes)` `"104,105"`; URLSearchParams `?q=a+b%26c%23d`; async-iterable chunk sum 5; custom iterable spread/`Array.from`; generator laziness (2 computations for 2 values); splice skip leaves `["cd","efg"]` vs filter `["efg"]`; `reduce` TypeError on empty; EPSILON `2.7755575615628914e-17` and tolerance true; `isNaN("abc")` true / `Number.isNaN("abc")` false; `2^53 === 2^53+1`; `(2**31)|0` -> -2147483648; `2n**10n` works / `Math.pow(BigInt)` throws; `1/0` Infinity, `0/0` NaN; `parseInt("19.99")` 19 vs `Number("19.99")` 19.99; iterator `return()` on break; Map `for...of` with break; `0.29*100` -> 28.999999999999996, `Math.round` -> 29.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| typescript-io-stream-chunks | verified | Node createReadStream/for-await example + whole-file memory wording | - |
| typescript-io-backpressure | verified | Node "write() ... return false" / wait for 'drain' wording | `drain()` is a declared abstraction, not a native method (note) |
| typescript-io-text-decode | verified | MDN decoder-to-string/encoding wording; `String(bytes)` probe | - |
| typescript-io-path-join | verified | Node "platform-specific separator ... normalizes" wording | `@ts-expect-error` import convention confirmed |
| typescript-io-url-encode | verified | MDN percent-encode set wording; encoding probe | - |
| typescript-io-pipeline | verified | Node "forwarding errors and properly cleaning up" + pipe leak caveat | - |
| typescript-io-mkdir-recursive | verified | Node recursive/EEXIST wording + example | - |
| typescript-io-write-exclusive | verified | Node `wx` -> EEXIST example | - |
| typescript-io-no-exists-check | verified | Node "introduces a race condition" wording | Good swallows all read errors like the Bad (note) |
| typescript-num-money-minor-units | verified | MDN IEEE-754 double wording + EPSILON 0.2-0.3+0.1 example | - |
| typescript-num-round-minor-units | verified | MDN Math.round wording; 0.29*100 probe | - |
| typescript-num-epsilon-compare | verified | MDN magnitude-scaled multiplier guidance (`2000 * Number.EPSILON`) | scaling explicitly endorsed by source |
| typescript-num-nan-test | verified | MDN global-isNaN-coerces wording; coercion probes | `value as number` cast needed to compile the anti-pattern; accepted |
| typescript-num-safe-integer | verified | MDN ±(2^53-1) wording; 2^53 collision probe | - |
| typescript-num-bitwise-32 | verified | MDN "operands as a set of 32 bits"; sign-flip probe | - |
| typescript-num-exponent-operator | verified | MDN "equivalent to Math.pow(), except it also accepts BigInts" | - |
| typescript-num-division-zero | verified | MDN division-by-zero Infinity / NaN wording; 0/0 and avg([]) probes | literal 0/0 example not on cited pages (note) |
| typescript-num-parseint-decimal | verified | MDN "stops at the decimal point" + Number-conversion wording; probes | - |
| typescript-pat-assertion-function | verified | TS Narrowing assertion-functions section; strict compile proves narrowing | longer snippets by design, both <= 25 lines |
| typescript-pat-type-predicate | verified | TS Narrowing "pet is Fish is our type predicate" wording | - |
| typescript-pat-custom-iterable | verified | MDN/TS Symbol.iterator wording; spread/Array.from probes | - |
| typescript-pat-generator-lazy | verified | MDN generator-function/yield wording; laziness probe (2 computations) | TS citation no longer covers generators (non-blocking; see Other findings) |
| typescript-pat-for-of-map | verified | MDN "[key, value] ... insertion order" wording; probe | forEach no-break/await clause is standard semantics (note) |
| typescript-pat-filter-not-splice | verified | MDN filter shallow-copy wording; skip-bug probe | index-shift mechanism standard (note) |
| typescript-pat-iterator-consumer | verified | MDN return()-for-cleanup wording; early-exit probe | - |
| typescript-pat-reduce-initial-value | verified | MDN index-0 fallback + empty-array TypeError wording; probe | - |

## Rejects (left `status: draft`)

None. All 26 rules passed every check.

## Other checks

- No version numbers in any of the 26 files; `baseline: latest` on all; no `compile_exempt`; no TODO/FIXME/XXX/TBD; no hedging warnings; all summaries <= 30 words.
- Exactly one `## Bad` and one `## Good` with a `typescript` fence each; section order Why/Bad/Good/See Also; all `related` ids resolve; all See Also links resolve to files in the pack; INDEX.md covers every one of the 26 filenames.
- Duplicate scan (title+summary and full-body token Jaccard, batch vs all 219 TypeScript rules): highest pair involving batch-9 is `io-mkdir-recursive` vs `io-write-exclusive` at 0.40 full-body (distinct decisions: directory chain creation vs atomic file claim), below the 0.45 near-duplicate threshold used in prior batch reports; no duplicate titles or summaries. Cross-checked `num-parseint-decimal` vs `conv-parseint-radix`, `pat-filter-not-splice` vs `anti-array-delete`, `pat-iterator-consumer` vs `async-async-iteration`, `pat-custom-iterable` vs `api-iterable-params`, `num-safe-integer` vs `data-large-integers` - all complementary and cross-linked, no contradictions.
- Post-flip re-validation: 26/26 clean, 0 errors / 0 warnings / 52-52 compile.
- Only the 26 batch files (`status` flips) and this report were edited; `INDEX.md` and other rules were not touched.

## Counts

- Verified: 26/26 (flipped `status: draft` -> `status: verified`)
- Rejected: 0/26
