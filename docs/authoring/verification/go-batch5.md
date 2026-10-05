# Verification Report - Go Batch 5 (`perf`, `obs`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/go/perf-*.md` (13), `catalog/rules/go/obs-*.md` (10) - 23 rules, all entered as `status: draft`
- Toolchain: go1.27.1 darwin/arm64 (`module scratch`, `go 1.27`); deterministic validator `node dist/rules/cli.js validate --lang go [--no-compile]`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch5` (sources, compile module, behavior programs, validator logs)

## Method

1. Fetched all 19 distinct cited URLs (HTTP 200) with `webfetch`/`curl`: go1.27 notes, diagnostics, pkg.go.dev runtime/pprof, runtime/trace, net/http, net/http/pprof, encoding/json, expvar, log/slog, builtin, testing, strings, regexp, slices, io, go.dev/blog/slog, go.dev/blog/go-slices-usage-and-internals, go.dev/doc/faq, google.github.io/styleguide/go/best-practices. Extracted the claim-specific passages (quoted in the table).
2. Extracted both snippets from all 23 rules (46) into a scratch module (`module scratch`, `go 1.27`) with the imports the declaration-level snippets need. 46/46 snippet dirs pass `go build ./...`; `go vet ./...` is fully clean (the three intentional diagnostics live in batches 2-3, as stated).
3. Ran bounded behavior programs (timeouts): map preallocation, builder Grow/Reset, io.Copy, FieldsSeq, regexp compile-once, HTTP client reuse (server-side ConnState connection counting), JSON decoder streaming, CPU profile, trace task, pprof labels, goroutineleak profile, expvar counter, AllocsPerRun, slices.BinarySearch, six slog rules, and the explicit pprof mux.
4. Duplicate assessment for `perf-regexp-compile-once` vs verified `go-api-must-constructors` (token Jaccard + qualitative decision comparison).
5. Structural: `validate --lang go --no-compile` reports 0 issues for all 23 files; one `go` fence per Bad/Good; summaries 9-17 words; no TODO/FIXME; all `related` ids and See Also links resolve.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-perf-allocs-per-run | verified | testing docs: "AllocsPerRun returns the average number of allocations during calls to f... first run once as a warm-up... sets runtime.GOMAXPROCS to 1 during its measurement"; `B.ReportAllocs` present. Run: AllocsPerRun(build)=0, Good assertion passes. Build+vet. |
| go-perf-builder-grow | verified | strings docs: Grow "guarantee[s] space for another n bytes. After Grow(n), at least n bytes can be written to b without another allocation"; slices article "Growing slices (the copy and append functions)" reallocates and copies. Run: render output equal to unsized version. Build+vet. |
| go-perf-builder-reset | **rejected** | Why claims Reset "keeping the allocated capacity, so a hoisted builder amortizes the allocation across iterations" - false. GOROOT `src/strings/builder.go` `Reset()` sets `b.buf = nil` (drops the buffer). Run: `AllocsPerRun` of Reset+Grow on strings.Builder = 1 alloc/op (bytes.Buffer.Reset+Grow = 0); writeAll per-iteration builder = 6 allocs/op, hoisted+Reset = 6 allocs/op - identical. Fix: drop/reword the capacity claim (bytes.Buffer retains, strings.Builder does not). |
| go-perf-cpu-profile | verified | diagnostics: "cpu: CPU profile determines where a program spends its time while actively consuming CPU cycles"; runtime/pprof: StartCPUProfile "profile will be buffered and written to w", StopCPUProfile "only returns after all the writes... completed". Run: 660-byte profile produced around a busy loop. Build+vet. |
| go-perf-fields-seq | verified | strings docs: "FieldsSeq returns an iterator over substrings of s... yields the same strings that would be returned by Fields(s), but without constructing the slice"; SplitSeq present. Run: 3 words counted. Note: the go1.27 citation is traceability only (FieldsSeq shipped earlier and is not in the 1.27 notes). Build+vet. |
| go-perf-goroutineleak-test | **rejected** | Good snippet's `p.Count()` cannot detect leaks: GOROOT `runtime/pprof/pprof.go` shows only `writeGoroutineLeak` calls `runtime_goroutineLeakGC()`; `Count()` returns `work.goroutineLeak.count` from the last leak-detection GC. Run: a genuine unreachable blocked goroutine gives `Count()` = 0 before any `WriteTo`, = 1 after `p.WriteTo(io.Discard, 0)`. The assertion silently passes on leaks. Fix: trigger `p.WriteTo(io.Discard, 0)` before counting (or assert on the WriteTo output). |
| go-perf-http-client-reuse | **rejected** | Bad `&http.Client{}` per call has nil Transport, so it falls back to the shared `http.DefaultTransport` - no fresh pool, no per-request handshake. Run (server ConnState, 5 requests): zero-value Client per call = 1 new TCP conn (pool reused); explicit `&http.Transport{}` per call = 5; shared client = 0. The Good `&http.Client{}` also builds no Transport, contradicting the summary "Build one Client and Transport". Fix: make Bad construct a custom Transport per call, or drop the fresh-pool mechanism claim. |
| go-perf-io-copy | verified | io docs: "If src implements WriterTo, the copy is implemented by calling src.WriteTo(dst). Otherwise, if dst implements ReaderFrom, the copy is implemented by calling dst.ReadFrom(src)". Run: both loops copy "hello world". Build+vet. |
| go-perf-json-decoder-stream | verified | encoding/json: "A Decoder reads and decodes JSON values from an input stream"; `Token` and `More` present. Run: 2 items decoded from a reader. Note: go1.27 citation is traceability only (the release notes cover json/v2, not this Decoder API). Build+vet. |
| go-perf-map-preallocate | verified | builtin `make`: "Map: An empty map is allocated with enough space to hold the specified number of elements"; FAQ "Why are maps built in?" ("one excellent implementation with syntactic support"). Run: counts correct. Build+vet. |
| go-perf-regexp-compile-once | verified | regexp docs: "Compile parses a regular expression..."; "MustCompile... simplifies safe initialization of global variables holding compiled regular expressions"; "safe for concurrent use by multiple goroutines, except for configuration methods"; the doc's FindAll text points at the `Regexp.All` iterator form. Run: valid matches lowercase, rejects uppercase. Build+vet. Duplicate: see below. |
| go-perf-slices-binary-search | verified | slices docs: "BinarySearch searches for target in a sorted slice and returns the earliest position where target is found, or the position where target would appear in the sort order". Run: finds 5, rejects 4. Build+vet. |
| go-perf-trace-task | verified | runtime/trace: "The trace tool measures task latency as the time between task creation and when the End method is called, and provides the latency distribution per task type"; docs show tasks carried in a Context across goroutines; diagnostics "Tracing... analyze latency throughout the lifecycle of a call". Run: 4283-byte trace with task+region. Build+vet. |
| go-obs-expvar-counter | verified | expvar docs: "standardized interface to public variables, such as operation counters... via HTTP at /debug/vars in JSON... Operations... are atomic"; registers `cmdline`/`memstats`. Run: counter reaches 3 via `Add`. Build+vet. |
| go-obs-log-levels | verified | style guide: "messages at the error level should be actionable rather than 'more serious' than a warning", "Use log.Error sparingly"; slog defines integer levels. Run: Good emits level=WARN, Bad emits level=ERROR. Build+vet. |
| go-obs-log-no-pii | verified | style guide: many log sinks "not appropriate destinations for sensitive end-user information"; slog docs: LogValue "can be used to... redact secret information like passwords". Run: Good output has `name=ann`, never `hunter2`. Build+vet. |
| go-obs-log-value-deferred | verified | slog performance section: "arguments to a log call are always evaluated, even if the log event is discarded. If possible, defer computation..."; LogValuer doc: "may be used to defer expensive operations". Run at LevelError: Bad calls Snapshot once, Good zero times. Build+vet. |
| go-obs-pprof-explicit | verified | net/http/pprof: "typically only imported for the side effect of registering its HTTP handlers"; "If you are not using DefaultServeMux, you will have to register handlers with the mux you are using"; diagnostics shows the custom-path/port pattern with `pprof.Profile`. Run: admin mux serves `/debug/pprof/` 200 (2852 bytes), unregistered path 404. Build+vet. |
| go-obs-pprof-labels | verified | runtime/pprof `Do`: "Goroutines spawned while executing f will inherit the augmented label-set"; go1.27 notes: tracebacks "include runtime/pprof goroutine labels in the header line". Run: `pprof.Label` returns "worker" inside `Do`. Build+vet. |
| go-obs-slog-context | verified | slog docs: "It is recommended to pass a context to an output method if one is available"; blog: "you can pass a context.Context... so a handler can extract context information like trace IDs". Run: InfoContext record emitted with attributes. Build+vet. |
| go-obs-slog-handler | verified | slog docs: HandlerOptions.Level is "the minimum level to output... The program's main function typically does this"; "SetDefault also updates the default logger used by the log package". Run: JSON handler emits `"msg":"starting"`. Build+vet. |
| go-obs-slog-structured | verified | blog: "Structured logs use key-value pairs so they can be parsed, filtered, searched, and analyzed quickly and reliably". Run: message plus typed attrs in the record. Build+vet. |
| go-obs-slog-with-attrs | verified | blog performance: "The WithAttrs and WithGroup methods let the handler format attributes added by Logger.With once, rather than at each logging call"; `Logger.With` "includes the given attributes in each output operation". Run: both records carry id/region. Build+vet. |

## Duplicate assessment - `perf-regexp-compile-once` vs `api-must-constructors`

Not a near-duplicate; keep both. Token Jaccard = 0.386, but the overlap is shared vocabulary (regexp/MustCompile/global). The decisions differ: `api-must-constructors` is about initialization style (MustCompile vs Compile-and-panic in `init`), with a Bad that panics manually at init; `perf-regexp-compile-once` is about per-call compilation in a hot path, with a Bad that calls `regexp.Compile` inside a function on every call. The author scoped it to per-call compilation and cross-linked to `api-must-constructors`; the cross-link is present and accurate.

## Cross-cutting checks

- Sources: 19/19 cited URLs fetched (HTTP 200); every verified rule's core claim is carried by a primary source. Loose secondary citations (non-blocking, primary source carries the claim): go1.27 on `perf-fields-seq`/`perf-json-decoder-stream` (traceability only), diagnostics "Runtime statistics and events" on `obs-expvar-counter` (the expvar page carries the claim).
- Compile/vet: 46/46 snippet dirs pass `go build ./...`; `go vet ./...` fully clean - no batch-5 diagnostics to attribute.
- Behavior: all required safe cases run green - map preallocation, builder Grow/Reset (allocation counts included), io.Copy, FieldsSeq, compile-once regexp, HTTP client reuse connection counts, JSON decoder streaming, CPU profile (660 B), trace task (4283 B), pprof labels, goroutineleak probe, expvar counter, AllocsPerRun, slices.BinarySearch, six slog checks, explicit pprof mux (200/404). The task's "struct field ordering" case has no corresponding rule in this batch; the closest batch-5 case (`perf-fields-seq`) was run instead.
- Idiom/formatting/links: Good snippets are current-stable Go (make-with-size, Builder.Grow, io.Copy, slices.BinarySearch, strings.FieldsSeq, runtime/trace tasks, pprof.Do, slog contexts/LogValuer); Bad snippets are the claimed anti-patterns. Structural validator reports 0 issues for all 23; one `go` fence per Bad/Good; summaries 9-17 words; all `related` ids and See Also links resolve.
- Validator caveat: full `validate --lang go` (with compile) fails for most of the pack because the validator compiles snippets without injecting imports (the same limitation noted in batches 2-4); the scratch-module harness above is the authoritative compile check. Remaining validator errors after this batch are in `gen-*`/`sec-*` files (not batch 5).
- INDEX: `catalog/rules/go/INDEX.md` reads `Rules: 150 (verified: 102)` and is being edited concurrently by other agents; these 20 flips are not yet reflected in its verified count. Owner must reconcile - not part of this batch.

## Notes / follow-ups (outside verifier ownership)

- `perf-builder-reset`: reword Why ("Reset empties it while keeping the allocated capacity" is false for strings.Builder; only bytes.Buffer retains). Either state that the hoisted builder saves nothing on the buffer and drop the rule, or switch the Good to bytes.Buffer when retention is the point.
- `perf-goroutineleak-test`: make the Good snippet trigger detection, e.g. `p.WriteTo(io.Discard, 0)` before `p.Count()`, or assert on the profile written to a buffer; otherwise the test passes on real leaks.
- `perf-http-client-reuse`: the Bad needs an explicit per-call `&http.Transport{}` (or equivalent custom transport) for the claimed fresh-pool failure to occur; alternatively reword the Why/summary to match the actual behavior of a zero-value Client.

## Counts

- Verified: 20/23 (perf 10/13, obs 10/10)
- Rejected: 3 (`go-perf-builder-reset`, `go-perf-goroutineleak-test`, `go-perf-http-client-reuse`) - left `status: draft`
- Blockers: none beyond the three text/snippet fixes above

## Addendum (2026-10-05) - Re-verification of the three rejected rules

All three fixes were re-checked from scratch (sources, snippets, behavior probes); all now pass and were flipped to `verified`.

| rule id | verdict | evidence |
|---|---|---|
| go-perf-builder-reset | verified | Rewritten around `bytes.Buffer`. New source pkg.go.dev/bytes (HTTP 200): "Reset resets the buffer to be empty, but it retains the underlying storage for use by future writes. Reset is the same as Buffer.Truncate(0)" - quoted verbatim in the Why. Probe: `Reset`+`Grow(1)` AllocsPerRun = 0 (bytes.Buffer) vs 1 (strings.Builder, still drops); AllocsPerRun over 8 batches = 8.0 (fresh buffer per iteration) vs 1.0 (hoisted+Reset), matching the Why's "one allocation per batch ... against one per pass"; single-pass mallocs 8 vs 1; outputs equal. Build+vet. |
| go-perf-goroutineleak-test | verified | Good now calls `p.WriteTo(&buf, 0)` before `p.Count()`. GOROOT `runtime/pprof/pprof.go`: `writeGoroutineLeak` runs `runtime_goroutineLeakGC()` ("The leak-detection pass runs when the profile is written out"). Probe: clean program -> WriteTo then Count()=0 (no false positive); unreachable blocked goroutine -> WriteTo then Count()=1 (leak caught). Build+vet. |
| go-perf-http-client-reuse | verified | Bad now builds a configured `&http.Transport{IdleConnTimeout: 30s}` per call; Good hoists the client. New source citation net/http (HTTP 200): DefaultTransport "establishes network connections as needed and caches them for reuse by subsequent calls"; Client.Transport "If nil, DefaultTransport is used" - backing the Why's nil-Transport fallback note. Probe (5 requests, server ConnState): per-call configured Transport = 5 new TCP conns, hoisted client = 1; all responses 200. Build+vet. |

- Re-extracted all 46 snippets after the edits: 46/46 `go build ./...`; `go vet ./...` fully clean; structural validator reports 0 issues for all 23 batch-5 rules (including the three).
- Sources: pkg.go.dev/bytes and the net/http DefaultTransport/Client.Transport passages fetched and quoted above; the go1.27 goroutineleak-profile claim already stood.
- Duplicates: `perf-builder-reset` now concerns `bytes.Buffer` reuse (distinct from `go-mem-strings-builder`, which covers strings.Builder usage at all); no new near-duplicate pairs.
- Updated counts: batch 5 scope 23/23 verified (perf 13/13, obs 10/10); rejected 0.
