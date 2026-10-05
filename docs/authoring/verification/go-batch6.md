# Verification Report - Go Batch 6 (`sec`, `lint`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/go/sec-*.md` (12) + `catalog/rules/go/lint-*.md` (10) - 22 rules, all entered as `status: draft`
- Toolchain: go1.27.1 darwin/arm64 (`module scratch`, `go 1.27`); deterministic validator `node dist/rules/cli.js validate --lang go --no-compile`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/go-batch6-verify` (extracted snippets, `go build`/`go vet` logs, behavior program, structural checker)

## Method

1. Fetched all 19 distinct cited URLs (HTTP 200): pkg.go.dev/net/http, os/exec, encoding/json, crypto/md5, crypto/sha1, path/filepath, crypto/subtle, io, crypto/tls, html/template, cmd/vet, sync, context, log/slog, errors; go.dev/doc/database/sql-injection, go1compat, go1.27, wiki/CodeReviewComments. Extracted the claim-specific passages; cross-checked Go 1.27.1 `go doc`/GOROOT sources where the rendered page elides comments.
2. Extracted both snippets from all 22 rules (44) into the scratch module, wrapped as `package main` plus the project harness's `func main() {}` fallback (`src/rules/harness/go.ts`). `go build ./...` exit 0 for 44/44.
3. `go vet ./...`: reproduced exactly the expected diagnostic on each of the 10 `lint-*` Bad snippets (11 diagnostics; lostcancel emits two); every Good snippet and every `sec-*` snippet is vet-clean.
4. Ran one bounded behavior program (`go run ./behavior`, 10s exec context) covering every safe case requested: crypto/rand Text+Read, subtle compare, MaxBytesReader, cookie SameSite/Secure/HttpOnly, html/template vs text/template escaping, TLS MinVersion/InsecureSkipVerify defaults, exec argument passing, SQL parameterization through a stub driver, json v1-vs-v2 defaults, filepath.IsLocal, md5/sha256 KATs.
5. Structural checker over the 22 files: frontmatter fields, id/path match, baseline, section order, exactly one `go` fence per Bad/Good, summary word cap, trigger counts, `related`/See Also resolution across the catalog, anti-slop tokens/elisions, INDEX entry presence; plus a token-overlap near-duplicate scan of the Go pack. The validator's `--lang go --no-compile` run reports no errors for any batch-6 file.
6. Flip policy: only the 20 rules passing every check were flipped to `status: verified`; the 2 rejects were left `draft`.

## Compile / vet evidence

```
lint-structtag/bad:        struct field tag `json:name` not compatible with reflect.StructTag.Get: bad syntax for struct tag value
lint-stringintconv/bad:    conversion from int to string yields a string of one rune, not a string of digits
lint-errorsas-pointer/bad: second argument to errors.As must be a non-nil pointer to either a type that implements error, or to any interface type
lint-copylocks/bad:        inc passes lock by value: ...Counter contains sync.Mutex
lint-lostcancel/bad:       the cancel function is not used on all paths (possible context leak) + return may be reached without using cancel
lint-unreachable/bad:      unreachable code
lint-printf-verbs/bad:     fmt.Sprintf format %d has arg name of wrong type string
lint-unmarshal-pointer/bad: call of Unmarshal passes non-pointer as second argument
lint-slog-pairs/bad:       call to slog.Info missing a final value
lint-httpresponse/bad:     using resp before checking for errors
```

`go vet` on all 22 Good dirs and all 22 Bad dirs of the `sec-*` rules: zero diagnostics. The three older intentional diagnostics (stringer recursion, keyed literals, Fatal-in-goroutine) are not present in this batch.

## Behavior results (all green except the deliberate slog probe)

- crypto/rand: `Text()` len 26, distinct; `Read` n=32 no error.
- subtle: equal=1, differing=0, length mismatch=0.
- MaxBytesReader: read past limit returns `*http.MaxBytesError` with `Limit == 4`.
- cookie: header `session=tok; HttpOnly; Secure; SameSite=Lax`.
- html/template escapes `<script>` to `&lt;script&gt;`; text/template emits it raw.
- TLS: `MinVersion == tls.VersionTLS12` (0x303); zero-value client `InsecureSkipVerify == false`.
- exec: `Command("echo", "a; echo injected")` prints the argument literally; `sh -c` splits it (contrast).
- SQL: stub driver captured the query text unchanged and `"42"` as a separate argument.
- json: v1 accepts duplicate names and invalid UTF-8; v2 (`encoding/json/v2`, available by default on go1.27.1) rejects both.
- filepath: `../../etc/passwd` and absolute paths rejected by `IsLocal`; joined local path stays under the root.
- md5/sha256 known-answer tests pass.

## Source notes (non-blocking)

- `sec-cookie-samesite`: the net/http type doc carries the SameSite/CSRF sentence; the "browser-specific defaults" clause is true per web standards but is not literally in the Go 1.27 docs.
- `sec-sql-params`: the validator's `forbidden-token "Placeholder"` warning is a false positive - the word is the technical term ("Placeholder syntax varies by driver"), and the validator classes it as a warning; contract section 12 warnings do not block.
- `lint-httpresponse` (verified with note): net/http `Client.Do` documents "A non-nil Response with a non-nil error only occurs when CheckRedirect fails". Probe: connection-refused -> resp nil (the panic case the rule teaches); redirect loop -> resp non-nil with closed body. The sentence "returns a nil Response when the request fails" is an overgeneralization, but the actionable claim (check err before touching resp; latent nil dereference) is exactly vet's documented rationale.
- Source-title cosmetics: `sec-exec-args` cites "Package os/exec - LookPath" as a second entry for the same page although LookPath is not discussed; several rules list the same URL twice under two titles.

## Rejections (left `status: draft`)

- **go-lint-errorsas-pointer**: the vet diagnostic, snippets, and compile all pass, but the Why says misuse "means the match can never be recorded, so the caller silently gets false". The cited errors doc says the opposite: "As panics if target is not a non-nil pointer to either a type that implements error, or to any interface type." Probe on go1.27.1: nil target -> `panic: errors: target cannot be nil`; typed nil `*fs.PathError` passed by value -> `panic: errors: target must be a non-nil pointer`; non-pointer -> same panic. Fix: replace the silent-false sentence with the panic behavior (the rule then needs re-verification).
- **go-lint-slog-pairs**: vet diagnostic reproduces and snippets compile, but the Why claims a trailing key "logs the string `!(MISSING)` in place of the value". False on the baseline: TextHandler logs `... id=42 !BADKEY=method`, JSONHandler logs `"!BADKEY":"method"`; the cited log/slog doc says "Otherwise, the argument is treated as a value with key `!BADKEY`". `!(MISSING)` does not occur anywhere in `src/log/slog` (checked GOROOT and go1.21-go1.26 upstream sources). Fix: reword the Why to describe `!BADKEY` (the vet-check half of the sentence is accurate).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-sec-cookie-samesite | verified | net/http: "making it impossible for the browser to send this cookie along with cross-site requests... mitigate the risk of cross-origin information leakage... protection against cross-site request forgery". Run: `HttpOnly; Secure; SameSite=Lax` header. Build+vet clean. |
| go-sec-crypto-rand | verified | wiki: "Do not use package math/rand or math/rand/v2 to generate keys... Instead, use crypto/rand.Reader. If you need text, use crypto/rand.Text". Run: `Text()` distinct 26 chars; `Read` 32 bytes. Build+vet clean. |
| go-sec-exec-args | verified | os/exec: "intentionally does not invoke the system shell and does not expand any glob patterns... taking care to escape any dangerous input". Run: `a; echo injected` stays one argument; `sh -c` splits. Build+vet clean. |
| go-sec-html-template | verified | html/template: "generating HTML output safe against code injection... should be used instead of text/template whenever the output is HTML". Run: payload escaped vs raw. Build+vet clean. |
| go-sec-json-v2 | verified | encoding/json: "For historical reasons, the default behavior of v1 encoding/json unfortunately operates with less secure defaults. New usages of JSON in Go are encouraged to use encoding/json/v2"; v1 page documents v2 rejecting invalid UTF-8/duplicate names; go1.27 notes: packages available. Run: v1 accepts both, v2 rejects both. Build+vet clean. |
| go-sec-maxbytes-body | verified | net/http: MaxBytesReader "is similar to io.LimitReader but is intended for limiting the size of incoming request bodies... returns a non-nil error of type *MaxBytesError for a Read beyond the limit". Run: `*MaxBytesError{Limit:4}`. Build+vet clean. |
| go-sec-md5 | verified | crypto/md5 + crypto/sha1: "cryptographically broken and should not be used for secure applications". Run: KATs. Build+vet clean. |
| go-sec-sql-params | verified | sql-injection guide: `db.Query("SELECT * FROM user WHERE id = ?", id)`; "This is not secure!" for the fmt.Sprintf form; "turns the SQL statement into a prepared statement and sends it along with the parameter, which is separate"; placeholders vary by driver. Run: stub driver captured query text + separate arg. Build+vet clean. |
| go-sec-subtle-compare | verified | crypto/subtle: ConstantTimeCompare time "is a function of the length of the slices and is independent of the contents". Run: 1/0/0 for equal/differing/length-mismatch. Build+vet clean. |
| go-sec-tls-minversion | verified | crypto/tls: "By default, TLS 1.2 is currently used as the minimum. TLS 1.0 is the minimum supported by this package"; go1compat: "Compatibility is at the source level." Run: MinVersion 0x303. Build+vet clean. |
| go-sec-tls-verify | verified | crypto/tls: "If InsecureSkipVerify is true, crypto/tls accepts any certificate presented by the server... susceptible to machine-in-the-middle attacks... should be used only for testing". Run: zero-value client skips nothing. Build+vet clean. |
| go-sec-valid-path | verified | filepath: IsLocal "using lexical analysis only"; "If IsLocal(path) returns true, then Join(base, path) will always produce a path contained within base". Run: traversal/absolute rejected, join contained. Build+vet clean. |
| go-lint-copylocks | verified | vet: "check for locks erroneously passed by value"; sync: "A Mutex must not be copied after first use." Bad reproduces `inc passes lock by value`; Good clean. |
| go-lint-errorsas-pointer | **rejected** | Why "silently gets false" contradicts errors doc ("As panics if target is not a non-nil pointer...") and probe (panic for nil target / typed nil pointer / non-pointer). Vet diagnostic and snippets otherwise correct. |
| go-lint-httpresponse | verified | vet httpresponse help documents the deferred-Body-Close-before-err-check mistake and "latent nil dereference bugs"; Bad reproduces `using resp before checking for errors`; Good clean. Note: redirect-failure returns non-nil resp, so the "nil when the request fails" wording is a slight overgeneralization. |
| go-lint-lostcancel | verified | vet lostcancel + context: "Failing to call the CancelFunc leaks the child and its children until the parent is canceled. The go vet tool checks that CancelFuncs are used on all control-flow paths." Bad reproduces both diagnostics; Good clean. |
| go-lint-printf-verbs | verified | vet printf: "check consistency of Printf format strings and arguments... reports... mismatches (of number and type) between the verbs and their arguments"; printf is in the `go test` subset per cmd/vet. Bad reproduces; Good clean. |
| go-lint-slog-pairs | **rejected** | Why's "!(MISSING)" claim is false for slog on the baseline (`!BADKEY=method` text / `"!BADKEY":"method"` JSON; doc says treated as a value with key "!BADKEY"; token absent from GOROOT and go1.21-1.26 sources). Vet diagnostic and snippets otherwise correct. |
| go-lint-stringintconv | verified | vet: string(x) "return[s] the UTF-8 representation of the Unicode code point x, and not a decimal string representation". Bad reproduces; Good clean. |
| go-lint-structtag | verified | vet: "check that struct field tags conform to reflect.StructTag.Get". Bad reproduces `bad syntax for struct tag value`; Good clean. |
| go-lint-unmarshal-pointer | verified | vet: "report passing non-pointer or non-interface values to unmarshal"; encoding/json: "If v is nil or not a pointer, Unmarshal returns an InvalidUnmarshalError." Bad reproduces; Good clean. |
| go-lint-unreachable | verified | vet: "finds statements that execution can never reach because they are preceded by a return statement". Bad reproduces `unreachable code`; Good clean. |

## Cross-cutting checks

- Sources: 19/19 distinct cited URLs fetched (HTTP 200); every verified rule's core claim is carried by a primary source.
- Compile: 44/44 snippet dirs `go build` clean; `go vet` reproduces the 10 expected diagnostics only on the Bad snippets.
- Duplicates: token-overlap scan found no batch-6 near-duplicates (the only flagged pairs are `mem-maps-clone`/`mem-slices-clone` and `mem-slice-preallocate`/`perf-map-preallocate`, both outside this batch). The pointer pair (`lint-errorsas-pointer`/`lint-unmarshal-pointer`) and TLS pair are distinct decisions with distinct vet checks.
- Formatting/links: all 22 files pass frontmatter, section order, one-`go`-fence-per-section, summary caps, trigger counts, anti-slop, `related` and See Also resolution; all 22 batch-6 entries are present in `INDEX.md`; the validator reports no errors for these files.
- INDEX/categories counts: `INDEX.md` still reads `verified: 102` and `categories.md` still describes sec/lint as drafts; those files were not in this batch's ownership and need reconciliation by the owner.

## Counts

- Verified: 20/22 (sec 12/12, lint 8/10) - flipped to `status: verified`
- Rejected: 2 (`go-lint-errorsas-pointer`, `go-lint-slog-pairs`) - left `status: draft`
- Blockers: none beyond the two Why-text fixes above (both are one-sentence corrections; the snippets and vet diagnostics are correct)

## Addendum - re-verification of the three lint fixes (2026-10-05)

The two rejects and the reset `lint-httpresponse` came back as `status: draft` with rewritten Why text. All three were re-checked from scratch; the snippets are unchanged.

Method: re-extracted all 22 rules into the scratch module; `go build ./...` exit 0 for 44/44; `go vet ./...` reproduces the three expected diagnostics on the Bad snippets with zero diagnostics on the Good snippets (the only extra vet lines are from the verifier's own harness programs). Claim-specific behavior re-run in `recheck` plus the earlier `probe`; structural checker and `validate --lang go --no-compile` report no issues for these files.

| rule id | verdict | evidence |
|---|---|---|
| go-lint-errorsas-pointer | verified (flipped) | New Why matches the cited errors doc: "As panics if target is not a non-nil pointer to either a type that implements error, or to any interface type." Probe: nil target -> `errors: target cannot be nil`; typed nil `*fs.PathError` -> `errors: target must be a non-nil pointer`; non-pointer -> same. Bad vet diagnostic reproduced; Good clean. |
| go-lint-slog-pairs | verified (flipped) | New Why matches the cited slog doc: "Otherwise, the argument is treated as a value with key \"!BADKEY\"." Recheck: Bad call renders `msg=request id=42 !BADKEY=method`; Good renders `method=GET`; no `!(MISSING)`. Bad vet diagnostic reproduced; Good clean. |
| go-lint-httpresponse | verified (flipped) | New Why quotes the cited net/http contract: "On error, any Response can be ignored. A non-nil Response with a non-nil error only occurs when CheckRedirect fails, and even then the returned Response.Body is already closed." Probe: connection refused -> resp nil; redirect loop -> resp non-nil with closed body. Bad vet diagnostic reproduced; Good clean. Summary 11 words; previous overgeneralization note is resolved. |

### Final counts

- Verified: 22/22 (sec 12/12, lint 10/10) - all flipped to `status: verified`
- Rejected: 0
- Remaining follow-ups (outside verifier ownership): `INDEX.md` verified count and `categories.md` batch status still need reconciliation by the owner.
