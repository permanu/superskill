# Verification Report - Go Batch 9 (`doc`, `num`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/go/doc-*.md` (6) + `catalog/rules/go/num-*.md` (6) - 12 rules, all entered as `status: draft`
- Toolchain: go1.27.1 darwin/arm64 (`module scratch`, `go 1.27`); snippet wrapping per `src/rules/harness/go.ts` (prepend `package main`, append `func main() {}`)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/go-batch9` (fetched sources, 24 extracted snippets, build/vet logs, behavior module, structural checker)
- Ownership applied: all 12 `status:` fields flipped `draft` -> `verified`; this report created. No other edits; no git.

## Method

1. Fetched every cited URL (HTTP 200): go.dev/doc/comment, go.dev/ref/spec, pkg.go.dev/math, pkg.go.dev/math/big, pkg.go.dev/time. Extracted the claim-specific passages from the rendered pages (five distinct URLs cover all 12 rules).
2. Extracted both snippets from all 12 rules (24) into the scratch module using the project harness convention. `go build ./...` exit 0 and `go vet ./...` exit 0 for 24/24 dirs.
3. Ran bounded behavior probes (per-run timeout 60 s) for every requested case: div zero, narrowing overflow, float-to-int (incl. NaN/Inf/boundaries), NaN comparison, duration arithmetic, big exact values, plus the two doc-comment semantics probes (gofmt flattening, literal HTML in `go doc`).
4. Structural checker over the 12 files: frontmatter fields, id/path match, baseline, exact section order, exactly one `go` fence per Bad/Good, summary word cap and hedging, trigger counts, `related`/See Also resolution across the catalog, anti-slop tokens, INDEX entry presence, and a significant-word Jaccard near-duplicate scan against the whole Go pack.
5. Deterministic validator: `node dist/rules/cli.js validate --lang go --no-compile --json` (pack: 223 rules, 23 errors + 4 warnings - all in other batches (`mod-*`, `type-*`, and previously verified rules); 0 findings touch batch-9 files).
6. Flip policy: only rules passing every check were flipped to `status: verified`.

## Source verification

- **doc-reports-whether**: guide, Funcs: "Doc comments typically use the phrase 'reports whether' to describe functions that return a boolean. The phrase 'or not' is unnecessary." The guide's own example is `HasPrefix`; the rule's Good snippet mirrors it.
- **doc-behavior-not-implementation**: guide, Funcs: "Doc comments should not explain internal details such as the algorithm used in the current implementation. Those are best left to comments inside the function body. It may be appropriate to give asymptotic time or space bounds when that detail is particularly important to callers."
- **doc-field-comments**: guide, Types: "For a struct with exported fields, either the doc comment or per-field comments should explain the meaning of each exported field."
- **doc-concurrency-note**: guide, Types: "By default, programmers should expect that a type is safe for use only by a single goroutine at a time. If a type provides stronger guarantees, the doc comment should state them." Funcs: "By default, programmers can assume that a top-level function is safe to call from multiple goroutines; this fact need not be stated explicitly." and methods are "assumed to be restricted to a single goroutine at a time".
- **doc-no-nested-lists**: guide, Common mistakes: "Go doc comments do not support nested lists, so gofmt reformats [nested items] to [a flat list]"; "Rewriting the text to avoid nested lists usually improves the documentation and is the best solution."
- **doc-no-html**: guide, Syntax: comments are written in a syntax supporting "paragraphs, headings, links, lists, and preformatted code blocks"; "there is no support for complex features like font changes or raw HTML."
- **num-div-zero**: spec, Arithmetic operators: "If the divisor is a constant, it must not be zero. If the divisor is zero at run time, a run-time panic occurs."
- **num-narrowing-overflow**: spec, Conversions: "it is sign extended to implicit infinite precision; otherwise it is zero extended. It is then truncated to fit in the result type's size. ... The conversion always yields a valid value; there is no indication of overflow." math: `MaxInt8 = 1<<7 - 1`, `MinInt8 = -1 << 7` (also 16/32/64-bit limits).
- **num-float-to-int**: spec, Conversions: "When converting a floating-point number to an integer, the fraction is discarded (truncation towards zero)"; "In all non-constant conversions involving floating-point or complex values, if the result type cannot represent the value the conversion succeeds but the result value is implementation-dependent." math: "IsNaN reports whether f is an IEEE 754 'not-a-number' value."
- **num-nan-comparison**: spec, Comparison operators: "Floating-point types are comparable and ordered. Two floating-point values are compared as defined by the IEEE 754 standard." (NaN != NaN follows from IEEE 754; behavior probe confirms.) math: IsNaN as above.
- **num-duration**: time: "A Duration represents the elapsed time between two instants as an int64 nanosecond count." Constants `Nanosecond` through `Hour` are documented on the same page.
- **num-big-exact**: math/big: "Package big implements arbitrary-precision arithmetic (big numbers)." and "The zero value for an Int, Rat, or Float correspond to 0. Thus, new values can be declared in the usual ways and denote 0 without further initialization." spec, Constants: "Numeric constants represent exact values of arbitrary precision and do not overflow."; signed overflow is "deterministically defined by the signed integer representation" (two's-complement).

## Compile / vet evidence

```
mod (24 dirs: 12 rules x Bad/Good): go build ./... exit 0; go vet ./... exit 0 (no diagnostics)
behavior module: go build ./... exit 0
```

No snippet needed `compile_exempt`; all Bad snippets are legal Go whose failure is runtime (panic or silent wrong value) - the intended teaching mode for `doc`/`num`.

## Behavior results

- **div zero** (`divzero`): `average(10, 2)` -> 5; `average(10, 0)` -> `panic: runtime error: integer divide by zero` (exit 2). Matches spec.
- **narrowing overflow** (`narrow`): `int8(300)` -> 44, `int8(-129)` -> 127, `int8(1000)` -> -24 (silent truncation); checked helper returns "value out of int8 range" for those and passes 127 / -128 unchanged.
- **float-to-int** (`floatint`): raw `int64(NaN)` -> 0, `int64(+Inf)` / `int64(1e300)` / `int64(9.3e18)` -> 9223372036854775807 (implementation-dependent, garbage); checked helper rejects NaN, +Inf, 1e300, `2^63`, 9.3e18 and accepts `42.9` -> 42 and `-2^63` -> MinInt64 (boundary handling of `float64(math.MaxInt64)`/`float64(math.MinInt64)` is exact).
- **NaN comparison** (`nan`): `NaN == NaN` false; `NaN < 0` and `NaN > 0` false; `math.IsNaN` true; bad `contains` misses a NaN element/target, good `contains` finds it and still finds ordinary values.
- **duration** (`duration`): bare `time.Duration(5)` -> `5ns` (5 ns); `time.Duration(5) * time.Second` -> `5s` (5e9 ns) and equals `5*time.Second`.
- **big exact** (`big`): `int` factorial(21) -> -4249290049419214848 (wrapped), factorial(25) -> 7034535277573963776 (wrong); `big.Int` factorial(25) -> 15511210043330985984000000, factorial(30) -> 265252859812191058636308480000000 (exact).
- **doc nested lists** (`gofmt -d`): the Bad-style nested `*` subitems are flattened by gofmt into a single level of `-` items, exactly as the guide states.
- **doc HTML** (`go doc -all`): `<b>Parse</b>` appears literally in the rendered doc output; no HTML rendering.

## Structural, duplicates, links

- All 12: id/path match, `lang: go`, prefix `doc`/`num`, `baseline: latest`, valid severity/enforce, exact section order, exactly one `go` fence per Bad/Good (all <= 25 lines), summaries <= 30 words with no hedging, keywords 2-8, no banned tokens/elisions, all `related` ids and See Also links resolve, and all 12 are present in `INDEX.md`.
- Validator: 0 errors and 0 warnings on batch-9 files. The pack's 23 errors and 4 warnings are in other batches (`mod-*`/`type-*` index entries and previously verified rules), outside scope.
- Near-duplicates: highest significant-word Jaccard is 0.44 (`num-narrowing-overflow` vs `num-float-to-int`) and 0.36 (`doc-reports-whether` vs `doc-behavior-not-implementation`). Eyeballed: the conversion pair splits integer-to-integer vs float-to-int (different mechanism, sources, and snippets, cross-linked); the doc pair splits phrasing vs contract-vs-implementation. All other pairs <= 0.37. No keyword-level duplicates found elsewhere in the Go pack (`reports whether`, `nested list`, `raw HTML`, `IsNaN`, `big.Int`, `divide by zero` appear only in the owning rules). Cross-language analogues (C/Java/Rust/Python `doc-*`/`num-*`) are separate per-language rules, as the contract requires.

## Non-blocking notes

- `doc-concurrency-note` and `doc-no-nested-lists` cite the same URL twice under two titles; both passages exist and are quoted above - cosmetic.
- `num-nan-comparison`'s IEEE-754 sentence is an inference from the spec's delegation ("compared as defined by the IEEE 754 standard"); IEEE 754 defines NaN != NaN, and the behavior probe confirms. Accepted.
- `num-float-to-int`'s summary says "unspecified int" while the spec says "implementation-dependent"; implementation-dependent implies unspecified. Accepted.
- `INDEX.md` verified count (168) and `categories.md` batch status were not updated (owner reconciliation; outside verifier ownership), and the pack has since grown beyond the INDEX's 201 listed rules - all in other batches.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-doc-reports-whether | verified | Guide: "typically use the phrase 'reports whether' ... The phrase 'or not' is unnecessary"; example is `HasPrefix`. Build+vet clean. |
| go-doc-behavior-not-implementation | verified | Guide: "should not explain internal details such as the algorithm used in the current implementation"; asymptotic bounds exception quoted. Build+vet clean. |
| go-doc-field-comments | verified | Guide: "either the doc comment or per-field comments should explain the meaning of each exported field." Build+vet clean. |
| go-doc-concurrency-note | verified | Guide: types single-goroutine by default, stronger guarantees "should state them"; top-level funcs "safe to call from multiple goroutines". Build+vet clean. |
| go-doc-no-nested-lists | verified | Guide: "do not support nested lists, so gofmt reformats" to flat; probe: `gofmt -d` flattened nested `*` items to `-` items. Build+vet clean. |
| go-doc-no-html | verified | Guide: syntax is "paragraphs, headings, links, lists, and preformatted code blocks"; "no support for ... raw HTML". Probe: `<b>Parse</b>` literal in `go doc -all`. Build+vet clean. |
| go-num-div-zero | verified | Spec: "If the divisor is zero at run time, a run-time panic occurs." Run: panic "integer divide by zero" (exit 2). Build+vet clean. |
| go-num-narrowing-overflow | verified | Spec: truncation to fit, "no indication of overflow"; math MinInt8/MaxInt8. Run: `int8(300)=44`, `int8(-129)=127`; checked helper errors. Build+vet clean. |
| go-num-float-to-int | verified | Spec: truncation towards zero; out-of-range "implementation-dependent"; math IsNaN. Run: raw NaN/Inf/1e300 -> garbage; checked helper rejects, boundaries exact. Build+vet clean. |
| go-num-nan-comparison | verified | Spec: floats "compared as defined by the IEEE 754 standard"; math IsNaN. Run: `NaN == NaN` false; bad contains misses NaN, good contains finds it. Build+vet clean. |
| go-num-duration | verified | time: Duration is "an int64 nanosecond count"; unit constants documented. Run: bare 5 -> 5ns; `*time.Second` -> 5s (5e9 ns). Build+vet clean. |
| go-num-big-exact | verified | math/big: "arbitrary-precision arithmetic", zero value ready to use; spec: constants exact, runtime signed overflow deterministic. Run: int 21! wrapped negative; big 25!/30! exact. Build+vet clean. |

## Counts

- Verified: 12/12 - all flipped to `status: verified`
- Rejected: 0
- Blockers: none (non-blocking notes above only)
