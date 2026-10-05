# Verification Report - Go Batch 3 (`api`, `test`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/go/api-*.md` (15), `test-*.md` (16) - 31 rules
- Toolchain: go1.27.1 darwin/arm64 (`module scratch`, `go 1.27`)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/go-batch3` (sources, compile module, behavior module)

## Method

- Fetched all 19 distinct cited URLs (all HTTP 200) and captured the passage backing each claim. Loose secondary citations are noted below; every rule's core claim is carried by a primary source.
- Extracted both snippets from all 31 rules into a scratch module (`module scratch`, `go 1.27`) with the imports the declaration-level snippets need; 62/62 snippet dirs pass `go build ./...`.
- Ran `go vet` per snippet dir: clean except the two documented diagnostics in this batch (`composites`, `testinggoroutine`), which are the `enforce` evidence. Also re-confirmed read-only (batch 2's file) the `printf` "recursive" diagnostic for `iface-stringer-no-recursion`.
- Ran bounded behavior probes in a separate module: options struct, keyed literals, zero value, return-zero-on-error, constructors, cleanup order and helper-defer, TempDir, parallel subtests, Setenv, t.Context, table-driven subtests and `-run` filtering, benchmarks (b.Loop and b.N), fuzz seeds plus a bounded 2s fuzz run, example outputs, short mode, keep-going, helper attribution, failure-message format, Fatal-in-goroutine.
- Duplicate scan (token Jaccard) across all Go rules: no pair at or above 0.35 involving batch 3; no pair at or above 0.40 pack-wide.
- Structural: `node dist/rules/cli.js validate --lang go --no-compile` reports 0 errors/warnings for all 31; all See Also relative links resolve; INDEX lists every file.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-api-constructors-new | verified | Effective Go "Constructors and composite literals" (NewFile returns an initialized `*File`); decisions "Repetition" (`widget.NewWidget -> widget.New`); best-practices "Godoc also group constructors along with the types they return". Build+vet; NewUser round-trip run. |
| go-api-deprecate-marker | verified | doc/comment "Deprecations": paragraphs starting `Deprecated:` are notices, tools warn, pkg.go.dev hides docs by default, replacement recommended. Build+vet. |
| go-api-doc-errors | verified | go1.13-errors: "wrapping an error makes that error part of your API" plus the `DoSomething returns an error wrapping ErrPermission` doc-comment example with the `errors.Is` contract. Build+vet. |
| go-api-doc-exported | verified | CRC "Doc Comments": all top-level exported names should have doc comments that begin with the name and end in a period; doc/comment "complete sentences naming the declared symbol". Build+vet. |
| go-api-error-last | verified | decisions "Returning errors": "By convention, error is the last result parameter"; Effective Go multiple return values `(n int, err error)`. Build+vet. |
| go-api-init-minimal | verified | best-practices "Program initialization": errors "should be propagated upward to main"; Effective Go "Initialization". Build+vet. |
| go-api-keyed-struct-literals | verified | go1compat "Struct literals": unkeyed literals fail after a field addition, "we therefore recommend... keyed notation"; decisions "Field names"; vet composites emits the expected `io/fs.PathError struct literal uses unkeyed fields` on Bad, Good vet-clean; `errors.Is` run. |
| go-api-must-constructors | verified | regexp MustCompile doc: "panics if the expression cannot be parsed. It simplifies safe initialization of global variables holding compiled regular expressions"; CRC "Don't Panic" secondary. Build+vet. |
| go-api-nil-vs-empty-slice | verified | decisions "Nil slices": "Do not create APIs that force their clients to make distinctions between nil and the empty slice"; CRC "Declaring Empty Slices" (interface sentence). Build+vet. |
| go-api-option-defaults | verified | decisions "Doc comments" examples `// optional; default: 10`; best-practices "Parameters and configuration": "Document the error-prone or non-obvious fields and parameters". Build+vet. |
| go-api-options-struct | verified | best-practices "Option structure": collects arguments, self-documenting, default fields omittable, per-field documentation, grows without call-site impact; decisions "Function formatting" points to it. Build+vet; options round-trip run. |
| go-api-pointer-to-interface | verified | FAQ "When should I use a pointer to an interface?" - "Almost never"; io functions take `io.Writer`/`io.Reader` directly. Build+vet. |
| go-api-return-zero-on-error | verified | decisions "Returning errors": callers must treat non-error results as unspecified, "commonly... zero values, but this cannot be assumed", `GoodLookup` returns nil on error; Effective Go. Build+vet; Bad returns the partial slice, Good nil. |
| go-api-unexport-unsupported | verified | ref/mod: major version must be incremented after a backwards-incompatible change, e.g. package removal; go1compat compatibility promise. Build+vet. |
| go-api-zero-value-useful | verified | Effective Go "Allocation with new": zero value usable, bytes.Buffer/sync.Mutex, "works transitively"; doc/comment: "Go types should also aim to make the zero value have a useful meaning. If it isn't obvious, that meaning should be documented." Build+vet; Good zero Set works, Bad panics. |
| go-test-benchmark-loop | verified | testing B.Loop: resets the timer on first call, stops it when the loop ends, keeps loop-body results alive; "New benchmarks should prefer using B.Loop". Build+vet; both b.Loop and b.N benchmarks run under `-benchtime=1x`. |
| go-test-cleanup | verified | testing T.Cleanup: runs when the test and all subtests complete, "last added, first called order". Build+vet; order `second,first` observed; Bad helper defer closes the file before use, Good keeps it open. |
| go-test-example-output | verified | testing "Examples": Output comment compared with stdout; "Example functions without output comments are compiled but not executed"; blog/examples "executable documentation". Build+vet; ExampleParse PASS; a wrong Output fails with got/want. |
| go-test-failure-message | verified | CRC "Useful Test Failures": wrong, inputs, got, expected, "order here is actual != expected"; TestComments "Got before Want", "Identify the Function", "Identify the Input". Build+vet; failure outputs compared. |
| go-test-fuzz-seeds | verified | testing "Fuzzing": seeds via F.Add, "small seed inputs with good code coverage" that "serve as regression tests"; security best-practices: "Fuzzing can often reach edge cases that programmers miss". Build+vet; seeds run; 2s fuzz 573,725 execs PASS. |
| go-test-fuzz-skip-invalid | verified | testing "Skipping": "The T.Skip method can be used in a fuzz target if the input is invalid, but should not be considered a failing input", with the FuzzJSONMarshaling `t.Skip()` example. Build+vet; seed corpus SKIP path observed. |
| go-test-helper | verified | TestComments "Mark Test Helpers": call t.Helper to attribute failures to the call line; testing T.Helper: file/line skipped. Build+vet; failure at helper line 11 without Helper vs caller line 18 with. |
| go-test-keep-going | verified | TestComments "Keep Going": keep running and print all failed checks, prefer t.Error over t.Fatal; Fatal for setup; inside t.Run Fatal ends the current subtest. Build+vet; Fatalf reported 1 failure, Errorf both. |
| go-test-no-fatal-in-goroutine | verified | testing T.FailNow: "must be called from the goroutine running the test... Calling FailNow does not stop those other goroutines"; vet testinggoroutine emits the expected `call to (*testing.T).Fatal from a non-test goroutine`. Run: unjoined Fatal after test completion produced `panic: Fail in goroutine after TestAsyncBad has completed`; Good channel pattern passes. |
| go-test-parallel-subtests | verified | blog/subtests "Control of Parallelism": parent does not complete until the parallel group finishes, teardown technique; testing T.Parallel. Build+vet; max concurrent 3, elapsed 101ms; parent cleanup runs after the group. |
| go-test-setenv | verified | testing T.Setenv: restores the previous value via Cleanup, "cannot be used in parallel tests or tests with parallel ancestors"; T.Chdir same reasoning. Build+vet; value set and restored; parallel call panics (recovered). |
| go-test-short-skip | verified | testing "Skipping": `if testing.Short() { t.Skip("skipping test in short mode.") }`. Build+vet; `-short` SKIP, normal run executes. |
| go-test-subtest-names | verified | TestComments "Choose Human-Readable Subtest Names" (escaping) and "Do not use the index of the test in the test table"; blog/subtests `TestTime/12:31_in_Europe/Zuri`. Build+vet; underscore-escaped names observed; `-run` filter selects a named case. |
| go-test-t-context | verified | testing T.Context: "canceled just before Cleanup-registered functions are called"; context.Background "is never canceled". Build+vet; canceled before cleanup, live during the body. |
| go-test-table-driven | verified | TableDrivenTests: "If you ever find yourself using copy and paste... refactoring into a table-driven test or... helper"; "test code is written once and amortized"; TestComments "Table-Driven Tests vs Multiple Test Functions". Build+vet; table subtests run. |
| go-test-tempdir | verified | testing T.TempDir: unique directory automatically removed when the test and all subtests complete. Build+vet; directory exists during the test and is gone after; path embeds the test name. |

## Cross-cutting checks

- Sources: 19/19 cited URLs fetched (HTTP 200); every core claim is backed by a primary source. Version numbers in source titles (`Working with Errors in Go 1.13`) are citations, not pins.
- Compile/vet: 62/62 snippet dirs pass `go build ./...`; per-dir `go vet` clean except the two expected diagnostics (`go-api-keyed-struct-literals` composites, `go-test-no-fatal-in-goroutine` testinggoroutine), each documented in its rule's Why. `go-iface-stringer-no-recursion` (batch 2) printf "recursive" diagnostic re-confirmed read-only.
- Behavior: all required safe cases run green - options round-trip, keyed literal `errors.Is`, table-driven subtests with `-run` filtering, Cleanup LIFO order and post-subtest timing, TempDir create/remove/unique, parallel overlap (3 concurrent, 101ms), benchmarks (b.Loop and b.N), fuzz seeds (plus 2s bounded fuzz), Setenv set/restore/parallel-panic, example Output pass and mismatch fail, short-mode skip, keep-going (1 vs 2 failures), helper line attribution, failure-message format, t.Context cancellation, zero-value behavior, return-zero-on-error, Fatal-in-goroutine panic.
- Idiom: Good snippets match current-stable Go (b.Loop, t.Context, t.Setenv, per-iteration loop vars with no pre-1.22 copy); Bad snippets are the claimed anti-patterns and are caught where the rule says (vet).
- Duplicates/consistency: no pair at or above 0.35 involving batch 3; no pair at or above 0.40 pack-wide; related/See Also links resolve.
- Formatting: validator reports 0 errors/warnings for all 31 (summary, section order, one fence per section, line limits, no placeholder/hedge tokens, id/path/prefix match, INDEX membership).

## Notes / follow-ups (outside verifier ownership)

- Loose secondary citations (non-blocking; primary source carries each claim): `test-benchmark-loop`, `test-cleanup`, `test-tempdir`, `test-short-skip` cite TestComments/CRC sections that do not mention b.Loop/Cleanup/TempDir/Short; `api-must-constructors` cites CRC "Don't Panic"; `api-deprecate-marker` cites go1compat; `api-options-struct` cites decisions "Function formatting" (which points to best-practices "Option structure").
- `api-doc-errors` Good says "returns an error wrapping ErrNotFound" while returning the sentinel directly; the `errors.Is` contract holds, but "matching" would be precise.
- `INDEX.md` verified count is stale after these 31 flips; the owner must update it.
- `iface-stringer-no-recursion` remains with the batch 2 verifier; its diagnostic was confirmed here only to close the shared vet check.

## Counts

- Verified: 31/31
- Rejected: 0
- Blockers: none
