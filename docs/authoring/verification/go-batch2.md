# Verification Report - Go Batch 2 (`conc`, `iface`, fixed `err-no-ignore`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-04
- Scope: `catalog/rules/go/conc-*.md` (16), `iface-*.md` (12), `err-no-ignore.md` (re-verification) - 29 rules
- Toolchain: go1.27.1 darwin/arm64 (`go 1.27` module); errcheck v1.20.0; race detector; `go fix` modernizers
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/go-batch2` (snippets, probes, validators)

## Method

- Fetched all 17 distinct cited URLs and captured the passages backing each claim (plus an exhaustive raw-text search of Effective Go for the sender-close claim).
- Extracted both snippets from all 29 rules into a scratch module (`module scratch`, `go 1.27`); 58/58 dirs pass `go build`; `go vet` is clean except the single documented `iface-stringer-no-recursion` Bad diagnostic, which is the rule's `enforce` evidence.
- Ran safe, bounded behavior probes: conc 26 checks (goroutine lifetime via `runtime.NumGoroutine`, once, WaitGroup.Go, bounded/unbounded parallelism, typed atomics, CAS vs mutex, defer unlock via `TryLock`, mutex map, receiver-close panic, done broadcast, select cancel, loopvar capture, stale stored context), iface 10 checks (optional capability, method sets via reflect, Stringer, canonical naming, narrow accept, generics equivalence, compile assertion), no-ignore 6 checks (real file write plus joined write/close causes).
- Race detector: nil-check init Bad → DATA RACE; mutex-map Bad → DATA RACE and `fatal error: concurrent map writes` on a plain run.
- Ran `go test` on synctest equivalents (Good 0.00s fake clock, Bad 0.10s sleep); `go fix -diff` on the typed-atomics Bad; errcheck on both no-ignore snippets; a negative compile proving unexported sealing.
- Structural checks across all 44 Go rules: frontmatter, id/path/prefix match, section order, one `go` fence per section, line/word limits, hedge scan, link/`related` resolution, INDEX file list, duplicate similarity scan.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-conc-atomics-not-locks | verified | sync/atomic: "These functions require great care... synchronization is better done with channels or the facilities of the sync package." Build+vet; run: mutex and CAS both hold the invariant, mutex rejects overdraft. |
| go-conc-bounded-parallelism | verified | pipelines "Bounded parallelism" ("limit these allocations by bounding the number of files read in parallel... fixed number of goroutines"); errgroup `SetLimit` "limits the number of active goroutines... to at most n". Run: semaphore max concurrency == 2; unbounded reaches > 2. |
| go-conc-close-sender | **rejected** | Why says "Effective Go states that only the sender should close a channel", but an exhaustive search of the current Effective Go page finds zero sender-close or closed-channel guidance (`sender` appears twice, both about blocking; `closed channel` 0; `close(ch)` 0). Pipelines supports only the pipeline-stage half. Fix the citation (A Tour of Go / the spec's send-on-closed panic) and re-verify. Behavior otherwise confirmed: receiver close → send panic; sender close → range terminates. |
| go-conc-context-not-in-struct | verified | context docs: "Do not store Contexts inside a struct type"; CRC: "Don't add a Context member to a struct type; instead add a ctx parameter to each method... one exception is for methods whose signature must match an interface..." Run: stored ctx goes stale after cancel; per-call ctx still works. Note: partial overlap with `err-context-first-param`'s summary clause (distinct central decisions, but the owner may want to tighten one). |
| go-conc-done-broadcast | verified | pipelines: "a receive operation on a closed channel can always proceed immediately... main can unblock all the senders simply by closing the done channel... broadcast signal"; "Keeping track of these counts is tedious and error-prone". Run: close wakes 5/5 waiters; one send wakes exactly 1. |
| go-conc-goroutine-lifetime | verified | CRC Goroutine Lifetimes: "make it clear when - or whether - they exit"; pipelines buffer/done cancellation; go1.27 release notes: goroutine leak profile "now generally available... named goroutineleak". Run: 20 blocked senders leak until drained; Good workers exit on cancel. |
| go-conc-loopvar-no-copy | verified | loopvar-preview: per-iteration scope "only apply in packages contained in modules that declare go 1.22 or later"; "remove the need for imprecise tools that prompt users to make unnecessary changes". Run: each goroutine sees its own iteration value. |
| go-conc-mutex-defer-unlock | verified | Effective Go Defer: "The canonical examples are unlocking a mutex or closing a file." Build+vet; run: Bad early return leaves the mutex locked (`TryLock` false); Good releases. |
| go-conc-mutex-map | verified | FAQ: "uncontrolled map access can crash the program"; sync Map docs. Run: `-race` reports DATA RACE for Bad; plain run aborts with "fatal error: concurrent map writes"; Good sums 1000 writes. |
| go-conc-once-init | verified | sync: `OnceValue` "invokes f only once and returns the value returned by f... may be called concurrently"; `OnceFunc`/`OnceValues` exist. Run: 100 concurrent callers → loader count 1, identical pointer; Bad nil-check shows DATA RACE under `-race`. Note: the CRC Goroutine Lifetimes citation is loose; sync docs carry the claim. |
| go-conc-select-cancel | verified | context: "Done is provided for use in select statements"; pipelines done-channel pattern. Run: Good worker exits on cancel; Bad worker still blocked after 50 ms. |
| go-conc-sync-function | verified | CRC Synchronous Functions: "Prefer synchronous functions... They're also easier to test". Build+vet. |
| go-conc-sync-map-workloads | verified | sync Map: "Most code should use a plain Go map instead, with separate locking... optimized for two common use cases: (1) write once read many... (2) disjoint sets of keys". Note: the Bad's "shared hot key" premise is implicit in the snippet. |
| go-conc-synctest | verified | testing/synctest: "isolated bubble", "fake clock", "Time in a bubble only advances when every goroutine in the bubble is durably blocked", "Wait blocks until all other goroutines in the bubble are durably blocked". Run: Good test 0.00s vs Bad sleep test 0.10s. |
| go-conc-typed-atomics | verified | sync/atomic: "Consider using the more ergonomic and less error-prone Int64.Add instead (particularly if you target 32-bit platforms...)" + alignment note; go1.27: "new modernizers (atomictypes...)"; `go fix -diff` rewrites the Bad to the Good verbatim. |
| go-conc-waitgroup-go | verified | sync: `WaitGroup.Go` (go1.25) "calls f in a new goroutine and adds that task... When f returns, the task is removed"; docs' primary example uses `Go` and `AddAndDone` is presented as the alternative; go1.27 renamed the analyzer to `waitgroupgo`. Run: 10/10 tasks. |
| go-iface-accept-narrow | verified | Effective Go: "fmt.Fprint and friends take as a first argument any object that implements the io.Writer interface"; FAQ: ideas "stem from a single interface (io.Writer) representing a single method (Write)... profound influence". Run: `bytes.Buffer` passes. |
| go-iface-canonical-name | verified | Effective Go: "call your string-converter method String not ToString"; decisions Getters: "should not use a Get or get prefix". Run: `ToString` invisible to fmt (`{1 2}`), `String` used (`1,2`). |
| go-iface-compile-assert | verified | FAQ: "var _ I = (*T)(nil) // Verify that *T implements I... caught at compile time"; Effective Go Interface checks. Run: assertion holds. |
| go-iface-consumer-defined | verified | CRC Interfaces: "Go interfaces generally belong in the package that uses values of the interface type... The implementing package should return concrete (usually pointer or struct) types". Build+vet. |
| go-iface-interface-over-typeparam | verified | when-generics verbatim: "If all you need to do with a value of some type is call a method on that value, use an interface type, not a type parameter... Don't make that kind of change... will generally not be faster". Run: interface and generic forms behave identically. |
| go-iface-no-mock-only | verified | CRC: "Do not define interfaces on the implementor side of an API 'for mocking'; instead, design the API so that it can be tested using the public API of the real implementation"; best-practices test doubles live in a dedicated `*test` package. Build+vet. |
| go-iface-not-premature | verified | CRC: "Do not define interfaces before they are used: without a realistic example of usage, it is too difficult to see whether an interface is even necessary...". Build+vet. |
| go-iface-optional-capability | verified | FAQ: "an interface with one or even zero methods can express a useful concept. Interfaces can be added after the fact"; research.swtch: "The runtime caches the itable after generating it, so that this correspondence need only be computed once"; io.Closer exists. Run: closer closed, non-closer untouched. |
| go-iface-receivers-consistent | verified | CRC: "Don't mix receiver types... If the receiver is a struct that contains a sync.Mutex or similar synchronizing field, the receiver must be a pointer"; FAQ guarantee. Run: value method set 1, pointer method set 2. |
| go-iface-seal-unexported | **rejected** | Source mismatch: the FAQ's marker method is exported (`ImplementsFooer()`), its purpose is explicit declaration, and FAQ/CRC contain no unexported-method sealing text (searched both). The mechanism itself works (negative compile: "does not implement seal.Payment (missing method paymentMethod)"), but no cited source documents it. Fix the citation (e.g., Go spec unexported-identifier semantics, or stdlib `testing.TB`'s unexported `private()` method) and re-verify. |
| go-iface-small-compose | verified | FAQ: "one or even zero methods can express a useful concept"; io docs: `type ReadWriter interface { Reader; Writer }` "groups the basic Read and Write methods"; Effective Go interface names. Build+vet. |
| go-iface-stringer-no-recursion | verified | Effective Go: `fmt.Sprintf("MyString=%s", m)` "Error: will recur forever" / "convert the argument to the basic string type"; `go vet` printf emits "format %s with arg m causes recursive ... String method call" - the rule's enforce evidence. Run: Good formats correctly. Note: the decisions "Named result parameters" citation is off-topic; Effective Go carries the claim. |
| go-err-no-ignore | verified | Fix confirmed: `var errs []error` + `errors.Join(errs...)` collects both the write and Close failures. errcheck v1.20.0 is now clean on the Good (Bad still flagged: `f.Write`, `f.Close`); run: real save works, and joined errors are matchable via `errors.Is` for both write and close causes. |

## Cross-cutting checks

- Compile: 58/58 snippet dirs pass `go build ./...` on go1.27.1; `go vet` clean except the one documented `iface-stringer-no-recursion` Bad diagnostic (expected; it is the enforce evidence).
- Behavior: conc 26/26, iface 10/10, no-ignore 6/6; race detector catches both concurrency anti-patterns; synctest fake-clock behavior demonstrated; `go fix -diff` rewrites the atomic Bad exactly; negative compile proves sealing.
- Formatting: validator over all 44 Go rules reports 0 problems (section order, one `go` fence per section, ≤25 lines, summaries ≤30 words, no hedge/TODO tokens, ids/paths/prefixes, `related` and See Also links resolve, INDEX lists all 44).
- Duplicates: no pair at ≥0.40 similarity; the overlapping families state distinct decisions (`context-not-in-struct`/`err-context-first-param` partial overlap noted; `consumer-defined`/`no-mock-only`/`not-premature` are three distinct CRC sentences; `close-sender`/`done-broadcast`, `mutex-map`/`sync-map-workloads`, `typed-atomics`/`atomics-not-locks` all distinct).
- Tool ids: `go fix:atomictypes` (go1.27 release notes + live rewrite), `go vet:printf` (diagnostic), `errcheck` (official repo; clean Good / flagged Bad).

## Notes / follow-ups (outside verifier ownership)

- `INDEX.md` still says `verified: 15` and `categories.md` still calls `conc`/`iface` drafts and `err-no-ignore` pending; stale after these flips (now 42 verified, 2 drafts) and must be updated by the owner.
- Rejected rules need only citation fixes (both mechanisms are correct and behavior-verified) then re-verification.
- Loose secondary citations (not blocking): `conc-once-init` (CRC Goroutine Lifetimes), `iface-stringer-no-recursion` (decisions Named result parameters).
- `conc-context-not-in-struct` overlaps the "never store it in a struct" clause already stated in `err-context-first-param`'s summary; consider tightening one to keep one idea per file.

## Counts

- Verified: 27/29
- Rejected: 2 (`go-conc-close-sender`, `go-iface-seal-unexported`)
- Blockers: citation fixes for the two rejected rules, then re-verify.

## Addendum (2026-10-05) - Re-verification of the two rejected rules

Both citation fixes were fetched and checked; both rules now pass and were flipped to `verified`.

| rule id | verdict | evidence |
|---|---|---|
| go-conc-close-sender | verified | `Package builtin - close` (pkg.go.dev/builtin): "It should be executed only by the sender, never the receiver"; spec (go.dev/ref/spec): "A send on a closed channel proceeds by causing a run-time panic" and receive-on-closed "yielding the element type's zero value"; pipelines stage-close kept. Snippets unchanged: build+vet pass; earlier behavior evidence stands (receiver close → send panic; sender close → range terminates). |
| go-iface-seal-unexported | verified | Spec "Uniqueness of identifiers": "Two identifiers are different if they are spelled differently, or if they appear in different packages and are not exported"; pkg.go.dev/testing renders `// contains filtered or unexported methods` inside `type TB interface`, and the stdlib source comment reads "A private method to prevent users implementing the interface and so future additions to it will not violate Go 1 compatibility." Snippets unchanged: build+vet pass; earlier negative compile (missing method `paymentMethod`) stands. |

- Structural validator re-run over all 44 Go rules: 0 problems.
- Updated counts: batch 2 scope 29/29 verified (conc 16/16, iface 12/12, err-no-ignore 1/1); Go pack 44/44 verified.
- `INDEX.md` (`verified: 15`) and `categories.md` batch status remain stale; owner must update.
