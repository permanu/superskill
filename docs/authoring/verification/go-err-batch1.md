# Verification Report - Go `err` Batch 1

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-04
- Scope: `catalog/rules/go/err-*.md` (16 rules; all entered as `status: draft`)
- Toolchain: go1.27.1 darwin/arm64 (`go 1.27` module); staticcheck v0.8.1; revive v1.17.0; errcheck v1.20.0
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/go-err-batch1` (snippets, probes, validators)

## Method

- Fetched all 11 distinct cited URLs (blog, Effective Go, Code Review Comments, FAQ, Google decisions/best-practices, errors/context/slog/errgroup docs, RFC 9110) and captured the passages backing each claim.
- Extracted both snippets from all 16 rules into a scratch module (`module scratch`, `go 1.27`) as separate `package main` dirs; `go build ./...` and `go vet ./...` pass on all 32.
- Ran a 49-check behavior probe binary (stdlib only, bounded, no network) covering every runtime claim: `%w` vs `%v` chains, sentinel/opaque contract, cancellation identity, retry classification/bounds/cancel, Join semantics, goroutine error collection, typed nil, partial writes, recover/re-panic, ignored-error silence, ctx-threaded request, duplicate context, Is/AsType traversal.
- Ran the three cited linters against the relevant snippets and confirmed the ids in official docs.
- Structural checks: frontmatter fields, id/path match, section order, one `go` fence per `Bad`/`Good`, ≤25 lines, summary ≤30 words, hedge/TODO scan, `related`/See Also link resolution, INDEX file-list match, duplicate/near-duplicate scan.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-err-contract-minimal | verified | Blog: "Wrap an error to expose it to callers. Do not wrap an error when doing so would expose implementation details."; best-practices on structured errors / fresh independent errors. Build+vet OK. Run: promised sentinel matchable via `errors.Is`; non-promised backend cause stays opaque (`!errors.Is`) while its text survives. Note: summary's "typed errors for fields" branch is stated in Why but not demonstrated by the snippet. |
| go-err-wrap-with-w | verified | Blog: `%w` "will have an Unwrap method returning the argument of %w"; "Creating a new error with fmt.Errorf discards everything from the original error except the text" (%v); best-practices `%w (wrap)` vs `%v (no wrap)` guidance. Build+vet OK. Run: `%v` breaks `errors.Is(err, os.ErrNotExist)` so `ErrKeyMissing` is unreachable; `%w` preserves the chain and lets `loadKey` translate. |
| go-err-context-preserve | verified | best-practices: "If the function can return an error, conventionally it is ctx.Err()"; context docs define `Canceled`/`DeadlineExceeded` as the values of `Context.Err`. Build+vet OK. Run: wrapped `ctx.Err()` matches `errors.Is` for both cancellation and deadline; `errors.New("operation timed out")` loses identity. |
| go-err-message-lowercase | verified | CRC Error Strings + decisions: "Error strings should not be capitalized (unless beginning with an exported name, a proper noun or an acronym) and should not end with punctuation." Tool: staticcheck ST1005 exists and fires on the Bad (`should not be capitalized`, `should not end with punctuation`); Good clean (only harness-artifact U1000). |
| go-err-partial-result | verified | Effective Go, Multiple return values: "In Go, Write can return a count and an error ... func (file *File) Write(b []byte) (n int, err error)". Build+vet OK. Run: failing writer yields `n=5` plus an error naming the count; full success yields `n=6, nil`. Note: the best-practices citation does not itself discuss partial results; Effective Go carries the claim. |
| go-err-recover-translate | verified | best-practices: "top-level deferred function that uses recover to translate a propagated panic into a returned error at the public API boundary. It requires the code that panics and recovers to distinguish between panics that the code raises itself and those that it doesn't"; Effective Go Recover. Build+vet OK. Run: own `*syntaxError` becomes an error; foreign panic is re-propagated. |
| go-err-retry-transient | verified | RFC 9110 §9.2.2 idempotent definition and "A client SHOULD NOT automatically retry a request with a non-idempotent method unless ..."; context docs select-on-`Done` idiom. Build+vet OK. Run: transient error retried to success on attempt 3; permanent stops at 1; exhausted wraps the sentinel at 5 attempts (~1 s < 3 s bound); cancellation stops the loop with `context.Canceled`. |
| go-err-join | verified | errors docs: "Any nil error values are discarded. Join returns nil if every value in errs is nil. The error formats as the concatenation ... with a newline between each string ... inspected with Is and As." Build+vet OK. Run: both children matchable, newline-separated; nil children ignored; all-nil returns nil. |
| go-err-no-typed-nil | verified | FAQ: typed nil "will always look as if there was an error even if nothing bad happened ... the function must return an explicit nil"; decisions: "Returning a nil error is the idiomatic way to signal a successful operation". Build+vet OK. Run: typed nil is a non-nil interface and panics if printed; Good returns nil on success. |
| go-err-panic-programmer-error | verified | CRC: "Don't use panic for normal error handling. Use error and multiple return values."; best-practices "When to panic": stdlib panics on API misuse, invariant checks, bugs not expected in production; FAQ on exceptions. Build+vet OK. |
| go-err-goroutine-collect | verified | CRC Goroutine Lifetimes: "When you spawn goroutines, make it clear when - or whether - they exit"; errgroup docs: "synchronization, error propagation, and Context cancellation for groups of goroutines"; errors.Join. Build+vet OK. Run: two failing subtasks surface and join; all-success returns nil; no deadlock. No errgroup snippet, so the stdlib pattern was run; x/sync not needed. |
| go-err-match-by-is-as | verified | errors docs: `Is` "should be used in preference to simple equality checks"; `As`: "For most uses, prefer AsType"; `AsType` (added go1.26.0) documented as the generic successor. Build+vet OK. Run: `==` fails on a wrapped sentinel, bare assertion misses, `errors.Is`/`errors.AsType` both traverse. Note: title names `errors.As` while the Good uses `errors.AsType`; the Why reconciles this and the stdlib recommendation backs it. |
| go-err-no-ignore | **rejected** | errcheck v1.20.0 - the rule's own cited enforcer - reports `snippets/no-ignore/good/main.go:14:16: f.Close()`: the Good snippet silently discards the Close error on the write-failure path, while the rule's summary says "never discard one silently" and its Why permits discarding only with a comment when the method cannot fail (`(*os.File).Close` can). Bad is flagged as expected (`f.Write`, `f.Close`). Sources otherwise match (CRC "Do not discard errors using _ variables"; decisions' `(*bytes.Buffer).Write` example). Suggested fix: join the Close error with the write error (cf. `go-err-join`) or handle it, then re-verify. |
| go-err-wrap-once | verified | best-practices "Adding information to errors": "avoid redundant information that the underlying error already provides. The os package, for instance, already includes path information". Build+vet OK. Run: Bad repeats the path twice; Good once; `run()` adds no extra layer. |
| go-err-log-once | verified | best-practices "Logging errors": "Avoid duplication. If you return an error, it's usually better not to log it yourself but rather let the caller handle it. The caller can choose to log the error, or perhaps rate-limit logging ..."; `slog.ErrorContext` exists in the log/slog docs. Build+vet OK. Behavior is policy; not run. |
| go-err-context-first-param | verified | context docs: "The Context should be the first parameter, typically named ctx" and "Do not store Contexts inside a struct type"; CRC Contexts: "Most functions that use a Context should accept it as their first parameter". Tool: revive `context-as-argument` exists and fires on a ctx-not-first function (`context.Context should be the first parameter of a function`). `go vet` lostcancel claim confirmed: "the cancel function is not used on all paths (possible context leak)". Run: a canceled context aborts the request with `errors.Is(err, context.Canceled)`. Caveat: revive does not fire on the Bad (no context parameter at all), so the tool covers the ordering convention only. |

## Cross-cutting checks

- Compile: 32/32 snippets pass `go build ./...` + `go vet ./...` on go1.27.1.
- Behavior: 49/49 checks pass, whole probe runs in ~3 s; only stdlib, no network, no writes outside temp.
- Formatting: all 16 follow the contract body order; exactly one `go` fence per `Bad`/`Good`; max snippet 22 lines; summaries ≤30 words; no TODO/hedge tokens in prose (two "ellipsis" flags were Go variadic syntax, explicitly allowed); all ids match paths; all `related` ids and `## See Also` links resolve; INDEX file list matches the 16 files.
- Duplicates: none; overlapping pairs state distinct decisions (`wrap-with-w`/`wrap-once`, `join`/`goroutine-collect`, `context-preserve`/`context-first-param`, `panic-programmer-error`/`recover-translate`).
- Tool ids (official docs): `errcheck` (kisielk/errcheck README), `staticcheck:ST1005` ("Incorrectly formatted error string"), `revive:context-as-argument` ("context.Context should be the first parameter of a function") all exist.

## Notes / follow-ups (outside verifier ownership)

- `INDEX.md` still says `Rules: 16 (verified: 0)`; stale after these flips and must be updated by its owner.
- `go-err-no-ignore` stays `draft`; fix as described and re-verify.
- `go-err-context-first-param`'s `enforce: tool` covers the ctx-ordering convention only; a missing context parameter is not caught by revive (or vet).
- Minor non-blocking notes: `go-err-partial-result`'s best-practices citation does not discuss partial results (Effective Go backs the claim); `go-err-contract-minimal` states a typed-error branch the snippet does not demonstrate.

## Counts

- Verified: 15/16
- Rejected: 1 (`go-err-no-ignore`)
- Blockers: fix the `go-err-no-ignore` Good snippet's unchecked `f.Close()` and re-verify.
