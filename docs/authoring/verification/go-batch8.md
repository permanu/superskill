# Verification Report - Go Batch 8 (`anti`, `proj`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/go/anti-*.md` (10) + `catalog/rules/go/proj-*.md` (8) - 18 rules, all entered as `status: draft`
- Toolchain: go1.27.1 darwin/arm64 (`module scratch`, `go 1.27`); harness wrapping per `src/rules/harness/go.ts` (prepend `package main`, add `func main() {}`)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/go-batch8` (extracted snippets, build/vet logs, behavior module, structural checker)
- Ownership applied: all 18 `status:` fields flipped `draft` -> `verified`; this report created. No other edits; no git.

## Method

1. Fetched all 12 distinct cited URLs (HTTP 200): go.dev/ref/spec, pkg.go.dev/maps, pkg.go.dev/net/http, pkg.go.dev/time, pkg.go.dev/log, pkg.go.dev/os, pkg.go.dev/context, go.dev/doc/effective_go, go.dev/doc/modules/layout, go.dev/ref/mod, google.github.io/styleguide/go/decisions, google.github.io/styleguide/go/best-practices. Extracted the claim-specific passages from the rendered pages.
2. Extracted both snippets from all 18 rules (36) into the scratch module using the project harness convention. `go build ./...` exit 0 and `go vet ./...` exit 0 for 36/36 dirs.
3. Ran bounded behavior probes (internal timeouts; 120 s shell cap) for every safe case requested: map iteration order, time equality/layout, context values, HTTP default client and body close, nil map write, nil channel, unchecked type assertion, log.Fatal in a library.
4. Ran four extra proj probes that can be demonstrated locally: one package per directory, internal import restriction, go directive refusal, `go mod tidy` removing a stale require.
5. Structural checker over the 18 files: frontmatter fields, id/path match, baseline, section order, exactly one `go` fence per Bad/Good, summary word cap and hedging, trigger counts, `related`/See Also resolution across the catalog, anti-slop tokens, INDEX entry presence, and a significant-word Jaccard near-duplicate scan against the whole Go pack.
6. Deterministic validator: `node dist/rules/cli.js validate --lang go --no-compile --json` (pack: 189 rules, 2 errors - both in other batches; 3 warnings, 1 in this batch, non-blocking).
7. Flip policy: only rules passing every check were flipped to `status: verified`.

## Source verification

- **anti-nil-map-write**: spec "A nil map is equivalent to an empty map except that no elements may be added."
- **anti-http-default-client**: net/http "DefaultClient is the default Client and is used by Get, Head, and Post"; "A Timeout of zero means no timeout."
- **anti-time-layout**: time "The reference time used in these layouts is the specific time stamp: 01/02 03:04:05PM '06 -0700 (January 2, 15:04:05, 2006, in time zone seven hours west of GMT)"; "Text in the layout string that is not recognized as part of the reference time is echoed verbatim during Format."
- **anti-map-iteration-order**: spec "The iteration order over maps is not specified and is not guaranteed to be the same from one iteration to the next"; maps repeats it for `Keys`/`Values`/`All` ("not specified and is not guaranteed to be the same from one call to the next").
- **anti-log-fatal-library**: log "The Fatal functions call os.Exit(1) after writing the log message"; os "The program terminates immediately; deferred functions are not run."
- **anti-context-values**: context "Use context Values only for request-scoped data that transits processes and APIs, not for passing optional parameters to functions."
- **anti-unchecked-type-assertion**: Effective Go "the program will crash with a run-time error. To guard against that, use the 'comma, ok' idiom"; spec "If the type assertion is false, a run-time panic occurs."
- **anti-time-equal**: time "the == operator compares not just the time instant but also the Location and the monotonic clock reading"; "In general, prefer t.Equal(u) to t == u"; Equal "correctly handles the case when only one of its arguments has a monotonic clock reading."
- **anti-nil-channel**: spec "A send on a nil channel blocks forever"; "Receiving from a nil channel blocks forever"; "Closing the nil channel also causes a run-time panic."
- **anti-http-body-close**: net/http "It is the caller's responsibility to close Body. The default HTTP client's Transport may not reuse HTTP/1.x 'keep-alive' TCP connections if the Body is not read to completion and closed"; body close "will also cause the body to be read to completion asynchronously, up to a conservative limit."
- **proj-go-mod-tidy**: mod "go mod tidy ensures that the go.mod file matches the source code in the module. It adds any missing module requirements ... and it removes requirements on modules that don't provide any relevant packages. It also adds any missing entries to go.sum and removes unnecessary entries"; "Most commands report an error if go.mod is missing information or doesn't accurately reflect reality."
- **proj-cmd-layout**: layout "A common convention is placing all commands in a repository into a cmd directory; while this isn't strictly necessary in a repository that consists only of commands, it's very useful in a mixed repository that has both commands and importable packages"; "it's recommended to keep the Go packages implementing the server's logic in internal."
- **proj-util-package**: decisions "Avoid uninformative package names like util, utility, common, helper, model, testhelper, and so on that would tempt users of the package to rename it when importing"; best-practices "Uninformative names make the code harder to read, and if used too broadly they are liable to cause needless import conflicts."
- **proj-major-version-suffix**: mod "If a module is released at major version 2 or higher, the module path must end with a major version suffix like /v2"; "Starting with major version 2, module paths must have a major version suffix like /v2 that matches the major version."
- **proj-internal**: layout "it's recommended placing such packages into a directory named internal; this prevents other modules from depending on packages we don't necessarily want to expose and support"; "It's recommended to keep packages in internal as much as possible."
- **proj-package-per-directory**: spec "A set of files sharing the same PackageName form the implementation of a package. An implementation may require that all source files for a package inhabit the same directory"; layout "each package has its own directory, and can be structured hierarchically."
- **proj-go-directive-minimum**: mod "The go directive sets the minimum version of Go required to use this module. Before Go 1.21, the directive was advisory only; now it is a mandatory requirement: Go toolchains refuse to use modules declaring newer Go versions."
- **proj-replace-main-module-only**: mod "replace directives only apply in the main module's go.mod file and are ignored in other modules."

## Compile / vet evidence

```
mod (36 dirs: 18 rules x Bad/Good): go build ./... exit 0; go vet ./... exit 0 (no diagnostics)
behavior module: go vet ./... exit 0
```

No snippet needed `compile_exempt`; all Bad snippets are legal Go whose failure is runtime, process, or layout behavior (panics, deadlocks, missing Close, non-executable layout) - the intended teaching mode for `anti`/`proj`.

## Behavior results

- **map iteration order** (`maporder`): over 400 ranges of an 8-key map, 8 distinct first keys and 8 distinct full orders observed; sorted first key stable (`"a"`). Order is genuinely nondeterministic.
- **time layout/equality** (`times`): `t.Format("%Y-%m-%d")` -> `"%Y-%m-%d"` (literal); `t.Format("2006-01-02")` -> `"2026-10-05"`; monotonic-stripped pair `a == b` false / `a.Equal(b)` true; same instant in different Location `==` false / `Equal` true.
- **context values** (`ctxval`): `WithValue` roundtrip requires an assertion (`Value` returns the interface); wrong key returns nil; `ctx.Err()` nil on a live context.
- **HTTP default client / body close** (`httpcheck`): `http.DefaultClient.Timeout == 0`; custom `Timeout: 200ms` fails in ~200ms with "context deadline exceeded (Client.Timeout exceeded while awaiting headers)"; body read+closed -> 2 requests on 1 connection; body never read/closed -> 2 connections (keep-alive reuse lost).
- **nil map write** (`nilmap`): write panics "assignment to entry in nil map"; `len`, read, and range on a nil map are safe (0 iterations).
- **nil channel** (`nilchan`): send blocked and receive blocked (300 ms timeouts); `close(nil)` panics "close of nil channel".
- **unchecked type assertion** (`typeassert`): single-value assertion panics "interface conversion: interface {} is int, not string"; comma-ok returns `"" ok=false`.
- **log.Fatal in library** (`fatal`): process exits 1; the deferred function never runs (no "deferred ran" output).
- **proj probes**: two packages in one dir -> "found packages store (store.go) and model (user.go)"; importing `example.com/a/internal/x` from module `example.com/b` -> "use of internal package example.com/a/internal/x not allowed"; `go 1.99` with `GOTOOLCHAIN=local` -> "go.mod requires go >= 1.99 (running go 1.27.1; GOTOOLCHAIN=local)"; `go mod tidy` (GOPROXY=off) removed the stale `require example.com/dead v1.0.0` (exit 0).

## Structural, duplicates, links

- All 18: id/path match, `lang: go`, `baseline: latest`, valid severity/enforce, exact section order, exactly one `go` fence per Bad/Good, summaries 7-13 words with no hedging, keywords 2-8, no banned tokens/elisions, all `related` ids and See Also links resolve, and all 18 are present in `INDEX.md`.
- Validator on the Go pack: 0 errors and exactly 1 warning in this batch (`anti-nil-channel`, hedging "often"); contract section 12 says warnings do not block. The pack's 2 errors are in other batches (doc/num), outside scope.
- Near-duplicates: highest significant-word Jaccard against the whole Go pack is 0.17 (`anti-context-values` vs `sec-sql-params`); the closest in-batch pairs (`proj-cmd-layout`/`proj-package-per-directory` 0.11) are distinct decisions. The related rules cross-checked (`lint-httpresponse` err-before-resp, `perf-http-client-reuse` reuse, `mem-map-clear` clear, `data-time-rfc3339`, `err-context-first-param`, `iface-optional-capability`, `err-panic-programmer-error`, `conc-close-sender`) all state different decisions.

## Non-blocking notes

- `anti-nil-map-write`: the `pkg.go.dev/maps` citation does not discuss nil maps; the spec citation carries every claim in the rule. (Maps package page does back `anti-map-iteration-order`.)
- `anti-http-default-client` and `anti-time-layout`/`anti-time-equal` cite the same page twice under two titles; both passages exist - cosmetic.
- `proj-go-mod-tidy`: the Bad/Good snippets differ only in their `go.mod` state comments; accepted for a process rule under the declaration-level convention (the comment states the contrast; behavior probe confirms tidy's effect). The other 7 proj pairs show the concrete artifact (paths, package clauses, module path, go line, replace/require) in their comments.
- `anti-http-body-close`: "goroutine machinery" is interpretive phrasing; the contract claim (caller closes Body; keep-alive reuse depends on it) is verified.
- `INDEX.md` verified count and `categories.md` batch status were not updated (owner reconciliation; outside verifier ownership).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-anti-nil-map-write | verified | spec "A nil map is equivalent to an empty map except that no elements may be added." Run: write panic "assignment to entry in nil map"; len/read/range safe. Build+vet clean. |
| go-anti-http-default-client | verified | net/http "DefaultClient is the default Client and is used by Get, Head, and Post"; "A Timeout of zero means no timeout." Run: DefaultClient.Timeout==0; custom 200 ms client -> "Client.Timeout exceeded while awaiting headers". Build+vet clean. |
| go-anti-time-layout | verified | time reference-time paragraph; "text not recognized ... is echoed verbatim". Run: `%Y-%m-%d` -> literal; `2006-01-02` -> "2026-10-05". Build+vet clean. |
| go-anti-map-iteration-order | verified | spec "iteration order over maps is not specified..."; maps repeats it. Run: 8 distinct first keys / 8 orders in 400 ranges; sorted key stable. Build+vet clean. |
| go-anti-log-fatal-library | verified | log "The Fatal functions call os.Exit(1)..."; os "deferred functions are not run". Run: exit 1, no deferred output. Build+vet clean. |
| go-anti-context-values | verified | context "Use context Values only for request-scoped data ... not for passing optional parameters". Run: assertion needed, wrong key nil. Build+vet clean. |
| go-anti-unchecked-type-assertion | verified | Effective Go "crash with a run-time error ... comma, ok idiom"; spec "If the type assertion is false, a run-time panic occurs." Run: panic "interface conversion ... int, not string"; comma-ok false. Build+vet clean. |
| go-anti-time-equal | verified | time "== operator compares ... Location and the monotonic clock reading"; "prefer t.Equal(u) to t == u". Run: `==` false / Equal true for monotonic-stripped and cross-Location pairs. Build+vet clean. |
| go-anti-nil-channel | verified | spec "A send on a nil channel blocks forever"; "Receiving from a nil channel blocks forever"; "Closing the nil channel also causes a run-time panic." Run: send/receive blocked; close panic "close of nil channel". Build+vet clean. |
| go-anti-http-body-close | verified | net/http "caller's responsibility to close Body"; keep-alive "may not reuse ... if the Body is not read to completion and closed". Run: read+close -> 1 conn for 2 requests; unclosed -> 2 conns. Build+vet clean. |
| go-proj-go-mod-tidy | verified | mod "go mod tidy ensures that the go.mod file matches the source code"; adds go.sum entries/removes unnecessary. Probe: stale require removed by `go mod tidy` (GOPROXY=off, exit 0). Build+vet clean. |
| go-proj-cmd-layout | verified | layout "common convention is placing all commands ... into a cmd directory"; "very useful in a mixed repository"; server logic in internal. Snippet comments show root vs `cmd/app` paths. Build+vet clean. |
| go-proj-util-package | verified | decisions "Avoid uninformative package names like util, utility, common, helper..."; best-practices "needless import conflicts". Snippet comments show `util/parse.go` vs `records/parse.go`. Build+vet clean. |
| go-proj-major-version-suffix | verified | mod "module path must end with a major version suffix like /v2"; "module paths must have a major version suffix ... that matches the major version". Snippet comments show `example.com/lib` vs `example.com/lib/v2`. Build+vet clean. |
| go-proj-internal | verified | layout "placing such packages into a directory named internal ... prevents other modules from depending"; "keep packages in internal as much as possible". Probe: cross-module import -> "use of internal package ... not allowed". Build+vet clean. |
| go-proj-package-per-directory | verified | spec "files sharing the same PackageName form the implementation of a package"; layout "each package has its own directory". Probe: two packages in one dir -> "found packages store ... and model". Build+vet clean. |
| go-proj-go-directive-minimum | verified | mod "sets the minimum version of Go required"; "mandatory requirement: Go toolchains refuse to use modules declaring newer Go versions". Probe: `go 1.99` + GOTOOLCHAIN=local -> "go.mod requires go >= 1.99 (running go 1.27.1)". Build+vet clean. |
| go-proj-replace-main-module-only | verified | mod "replace directives only apply in the main module's go.mod file and are ignored in other modules." Snippet comments show `replace ... => ../local/dep` vs `require ... v1.4.0`. Build+vet clean. |

## Counts

- Verified: 18/18 - all flipped to `status: verified`
- Rejected: 0
- Blockers: none (non-blocking notes above only)
