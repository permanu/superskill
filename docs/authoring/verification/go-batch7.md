# Verification Report - Go Batch 7 (`gen`, `data`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/go/gen-*.md` (9) + `catalog/rules/go/data-*.md` (12) - 21 rules, all entered as `status: draft`
- Toolchain: go1.27.1 darwin/arm64 (`module scratch`, `go 1.27`); deterministic validator `node dist/rules/cli.js validate --lang go` (with and without `--no-compile`)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/go-batch7` (extracted snippets, build/vet/test logs, baseline probes, structural checker)

## Method

1. Fetched all 10 distinct cited URLs (HTTP 200): pkg.go.dev/cmp, slices, maps, encoding/json, encoding/csv, time; go.dev/blog/when-generics, go.dev/ref/spec, go.dev/doc/faq, go.dev/doc/go1.27. Extracted the claim-specific passages from the rendered pages and cross-checked against Go 1.27.1 `go doc` where the rendered page elides comments.
2. Extracted both snippets from all 21 rules (42) programmatically from the markdown into the scratch module, wrapped as `package scratch`; `go build ./...` exit 0 for 42/42.
3. `go vet ./...` exit 0 - batch 7 carries none of the intentional diagnostics (those live in other batches).
4. Ran 33 bounded behavior tests (`go test ./... -count=1 -timeout 60s`) covering every safe case requested: JSON tags/omitempty/omitzero (v1 vs v2), UseNumber, TextMarshaler map keys, []byte base64, Encoder streaming, RawMessage deferral, csv flush errors/reuse, RFC3339 time, and the generics cases (cmp.Ordered, containers, inference, named slice constraints). All green; two initial harness expectations were corrected after observing actual baseline behavior (literal U+FFFD replacement chars; `UnsupportedValueError` for struct map keys).
5. Structural checker over the 21 files: frontmatter parse, id/path match, baseline, section order, exactly one `go` fence per Bad/Good, summary word cap, trigger types, `related`/See Also resolution, INDEX presence; plus a topic-overlap near-duplicate scan of the Go pack and both validator runs.

## Compile / vet evidence

```
go build ./...   -> exit 0 (42/42 snippet dirs)
go vet ./...     -> exit 0 (no diagnostics; batch 7 is vet-clean as expected)
```

## Behavior results (all green)

- `cmp.Ordered` Max: ints -> 3, strings -> "c", floats -> 3.25.
- Container: `Stack[int]` LIFO; zero-value pop returns `0,false`.
- Interface dispatch: `Size(word("abc")) == 3`; generic method `(&Rand{}).Pick(7) == 7`.
- Inference: `SortedCopy([]int{2,1})` -> `[1,2]`, input untouched; named slice: `Clone(IDs{1,2})` returns `IDs` (compile-time `var _ IDs = got`), nilness preserved, no aliasing.
- Helpers: `hasAdmin` via `slices.Contains`; `Sum` ints 6 / floats 4.
- csv: `writeCSV` reports a disk-full flush error via `cw.Error()` (Bad returns nil); `ReuseRecord=true` shares the backing array between reads while `readAll`'s immediate copy stays correct; default `Read` returns stable memory.
- json: tags `{"id":1,"email":"e"}` vs default `{"ID":1,"Email":"e"}`; `omitzero` false -> `{}` in both v1 and v2; `omitempty` false -> `{}` in v1 but `{"enabled":false}` in v2 (migration claim demonstrated); `UseNumber` keeps `"123456789012345678"` while float64 re-marshals as `123456789012345680`; struct map key -> `*json.UnsupportedValueError`, empty map -> `{}` no error; `DisallowUnknownFields` rejects `"typo"`, default ignores it; `RawMessage` preserves `1.0` exactly through re-marshal and defers decode; `[]byte{0xff,0xfe,0xfd}` -> `{"data":"//79"}` round-trips, string path corrupts to U+FFFD.
- time: `time.Time` -> `"2026-10-05T12:00:00.123456789Z"` round-trips; hand layout `"2006-01-02 15:04:05"` fails `time.Parse(time.RFC3339, ...)`.

## Source notes (non-blocking)

- `gen-cmp-ordered`: "excludes ... named types" is slightly overbroad - named types whose underlying type is int/float64 ARE admitted by `~int | ~float64`; the core claim (a local union freezes the type set; `cmp.Ordered` is canonical and may be extended) is exact per the cmp docs.
- `gen-inference`: "can even pin a different element type than intended" - explicit type arguments can pin a type inference would not choose (e.g. `f[any]`), although a mismatched slice element type is a compile error; the spec supports the main claim.
- `data-time-rfc3339`: "a hand-picked layout drops zone and precision" is true of the shown layout; a layout that includes zone + fraction could round-trip, but the rule's decision (let `time.Time` carry RFC 3339) stands.
- `gen-write-code-first`: validator hedging warning "consider" on line 5 - contract section 12 warnings do not block; the phrase mirrors the cited blog's own wording.
- Several rules list the same URL twice under two symbol-specific titles (csv, json, time, slices); cosmetic only.

## Rejections (left `status: draft`)

- **go-data-json-binary-base64**: frontmatter YAML is invalid - `keywords: [json, []byte, base64, binary, UTF-8]` parses `[]` as an empty flow sequence. Evidence: validator `fm-parse` error "missed comma between flow collection entries at line 11, column 22" and identical js-yaml failure. Source, snippets, and behavior all pass (base64 round-trip and corruption demo verified). Fix: quote `"[]byte"`; then re-verify.
- **go-data-json-null-vs-absent**: two failures. (1) `keywords: [json, null, pointer, absent, optional]` - unquoted `null` parses as a YAML null, not a string (validator `field-type` error: "must be an array of non-empty strings"). (2) The core claim is false: a `*string` field does NOT distinguish null from absent. The Unmarshal doc says null "sets the pointer to nil", and an absent key leaves the field at its zero value - probe: `absent=<nil> null=<nil> empty=0x...`. What a pointer actually separates is "key present with empty string" from "null or absent"; distinguishing null from absent requires `json.RawMessage`/map decoding or custom logic. Fix: retitle/reword accordingly; then re-verify.
- **go-data-json-text-keys**: the Why says a struct map key "makes the encoder return UnsupportedTypeError at run time". On the go1.27.1 baseline a non-empty `map[Tenant]int` returns `*json.UnsupportedValueError` (`json: unsupported value: jsontext: object member name must be a string after offset 2`), and an empty map marshals to `{}` with no error; the cited Marshal doc states the key-type restriction but not this error type. The TextMarshaler fix and the marshal/unmarshal round-trip are verified. Fix: say "an error" or name `UnsupportedValueError`; then re-verify.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| go-gen-cmp-ordered | verified | cmp: "Ordered is a constraint that permits any ordered type... If future releases of Go add new ordered types, this constraint will be modified"; Compare/Less define NaN order. Run: Max over int/string/float. Build+vet clean. |
| go-gen-containers | verified | when-generics: "Replacing an interface type with a type parameter can permit data to be stored more efficiently... avoid type assertions... fully type checked"; slices pkg: "functions useful with slices of any type". Run: `Stack[int]` LIFO. Build+vet clean. |
| go-gen-differing-impls-interface | verified | when-generics: "if the implementation is different for each type, then use an interface type and write different method implementations, don't use a type parameter"; FAQ: variant-type error example "easy to express using an interface value to hold the error and a type switch". Run: Sizer dispatch. Build+vet clean. |
| go-gen-generic-methods | verified | go1.27: "now supports generic methods: a method declaration may declare its own type parameters... within the namespace of a particular data type"; "methods of interfaces may not declare type parameters". Run: `(*Rand).Pick(7)` compiles and returns 7. Build+vet clean. |
| go-gen-inference | verified | spec: "A use of a generic function may omit some or all type arguments if they can be inferred from the context"; "Inferring the missing type arguments means solving the resulting set of type equations". Run: `SortedCopy([]int{2,1})` -> `[1,2]`. Build+vet clean. |
| go-gen-named-slice-constraint | verified | `slices.Clone` declared `[S ~[]E, E any](s S) S`; spec: "The type set of a term of the form ~T is the set of all types whose underlying type is T". Run: named `IDs` preserved (`var _ IDs = Clone(ids)`), nilness preserved, independent copy. Build+vet clean. |
| go-gen-prefer-functions | verified | when-generics: "prefer a function to a method... it is much simpler to turn a method into a function than it is to add a method to a type"; cmp exposes Compare/Less as functions. Run: `Max` with cmp func. Build+vet clean. |
| go-gen-stdlib-helpers | verified | slices: "defines various functions useful with slices of any type"; maps: "functions useful with maps of any type"; Contains/Clone/Sort documented in-package. Run: `hasAdmin` via `slices.Contains`; nilness via Clone. Build+vet clean. |
| go-gen-write-code-first | verified | when-generics: "If you find yourself writing the exact same code multiple times... consider whether you can use a type parameter"; "avoid type parameters until you notice that you are about to write the exact same code multiple times"; FAQ: "Generics are convenient but they come at a cost in complexity in the type system and run-time". Run: Sum ints/floats. Build+vet clean. |
| go-data-csv-flush-error | verified | csv Writer: "writes of individual records are buffered... the client should call the Writer.Flush method... errors... checked by calling the Writer.Error method"; Flush: "To check if an error occurred during Flush, call Writer.Error". Run: disk-full surfaced by Good, swallowed by Bad. Build+vet clean. |
| go-data-csv-reuse-record | verified | csv ReuseRecord: "calls to Read may return a slice sharing the backing array of the previous call's returned slice... By default, each call to Read returns newly allocated memory owned by the caller"; Read: returned slice "may be shared between multiple calls". Run: shared backing observed; readAll copy stays correct. Build+vet clean. |
| go-data-json-encoder-stream | verified | json: "Encode writes the JSON encoding of v to the stream, followed by a newline character". Run: two events -> two newline-framed lines; Bad produces equivalent framing by hand. Build+vet clean. |
| go-data-json-omitempty-vs-omitzero | verified | json Migrating to v2: "Existing usages of omitempty on a Go bool, number, pointer, or interface value should migrate to specifying omitzero instead (which is identically supported in both v1 and v2)"; v2 omitempty omits only values that "encode as an 'empty' JSON value". Run: omitempty false -> `{}` (v1) vs `{"enabled":false}` (v2); omitzero false -> `{}` both. Build+vet clean. |
| go-data-json-raw-defer | verified | json: "RawMessage is a raw encoded JSON value. It implements Marshaler and Unmarshaler and can be used to delay JSON decoding or precompute a JSON encoding". Run: `1.0` preserved through re-marshal; `any` re-marshal changes it to `1`. Build+vet clean. |
| go-data-json-tags-explicit | verified | json Marshal: "Each exported struct field becomes a member of the object, using the field name as the object key, unless the field is omitted". Run: tagged `{"id":1,"email":"e"}` vs default `{"ID":1,"Email":"e"}`. Build+vet clean. |
| go-data-json-unknown-fields | verified | json: "DisallowUnknownFields causes the Decoder to return an error when the destination is a struct and the input contains object keys which do not match any non-ignored, exported fields"; Unmarshal default "object keys which don't have a corresponding struct field are ignored". Run: typo rejected strict, ignored default. Build+vet clean. |
| go-data-json-use-number | verified | json: interface decoding stores "float64, for JSON numbers"; "UseNumber causes the Decoder to unmarshal a number into an interface value as a Number instead of as a float64". Run: `123456789012345678` kept as `json.Number`; float64 path re-marshals `123456789012345680`. Build+vet clean. |
| go-data-time-rfc3339 | verified | time.Time.MarshalJSON: "The time is a quoted string in the RFC 3339 format with sub-second precision". Run: nanosecond timestamp round-trips; hand layout fails `time.Parse(time.RFC3339, ...)`. Build+vet clean. |
| go-data-json-binary-base64 | **rejected** | Frontmatter YAML invalid: `keywords: [json, []byte, ...]` - `[]` parses as an empty flow sequence (validator `fm-parse` + js-yaml error, line 11 col 22). Snippets/source/behavior pass (base64 round-trip `{"data":"//79"}`; string path corrupts to U+FFFD). Fix: quote `"[]byte"`. |
| go-data-json-null-vs-absent | **rejected** | (1) `keywords: [json, null, ...]` -> YAML null, validator `field-type` error. (2) Claim false: pointer does not distinguish null from absent - Unmarshal "sets the pointer to nil" for null; probe `absent=<nil> null=<nil> empty=<ptr "">`. Pointer separates present-empty from null/absent; separating null from absent needs RawMessage/map or custom logic. |
| go-data-json-text-keys | **rejected** | Why's "return UnsupportedTypeError" false on the go1.27.1 baseline: non-empty `map[Tenant]int` -> `*json.UnsupportedValueError` ("json: unsupported value: jsontext: object member name must be a string after offset 2"); empty map -> `{}` no error. Cited Marshal doc gives the key restriction, not this error type. TextMarshaler fix + round-trip verified. Fix: say "an error"/`UnsupportedValueError`. |

## Cross-cutting checks

- Sources: 10/10 distinct cited URLs fetched (HTTP 200); every verified rule's core claim is carried by a primary source (passages quoted above).
- Compile: 42/42 snippet dirs `go build` clean; `go vet` clean (no intentional diagnostics in this batch).
- Behavior: 33/33 tests green under `go test -timeout 60s`; rejected-rule probes recorded (null/absent states, map-key error type).
- Duplicates: topic scan across the Go pack found no near-duplicates of these 21. The closest overlap (`gen-stdlib-helpers` mentioning Sort vs the already-verified `mem-slices-sort`) is a different decision, cross-linked; no other rule covers JSON tags/omitempty/RawMessage/UseNumber/DisallowUnknownFields, csv behavior, RFC3339 time, or `cmp.Ordered`.
- Formatting/links: 19/21 pass the structural checker; the 2 YAML failures are the rejects above. All 21 batch-7 entries are present in `INDEX.md`; every `related` id and See Also link resolves; the validator reports no other errors for these files (warnings: hedging "consider" in `gen-write-code-first`, non-blocking).
- INDEX/categories counts: `INDEX.md`'s `verified` count and `categories.md` were not reconciled by this batch (outside ownership); the owner should update them.

## Counts

- Verified: 18/21 (gen 9/9, data 9/12) - flipped to `status: verified`
- Rejected: 3 (`go-data-json-binary-base64`, `go-data-json-null-vs-absent`, `go-data-json-text-keys`) - left `status: draft`
- Blockers: none beyond the three fixes above (one YAML quote, one keyword quote + rewrite, one error-type wording); snippets and behavior are correct in all three.

## Addendum (2026-10-05) - Re-verification of the three rejected rules

The author applied the three fixes; all were re-checked from scratch (fresh reads, YAML parse, structural checker, snippet re-extraction, compile/vet, behavior tests, validator) and passed.

| rule id | verdict | evidence |
|---|---|---|
| go-data-json-binary-base64 | verified | `keywords` now quotes `"[]byte"`; YAML parses (validator and js-yaml clean). Snippets unchanged (re-extracted byte-identical); build/vet/test green. Source claims (base64 encoding, UTF-8 coercion) previously confirmed; round-trip `{"data":"//79"}` and U+FFFD corruption demo still pass. |
| go-data-json-null-vs-absent | verified | `"null"` quoted; title/summary/Why corrected to "a pointer separates present values (non-nil, possibly empty) from null or absent (nil)". The Why matches the Unmarshal doc verbatim: "The JSON null value unmarshals into an interface, map, pointer, or slice by setting that Go value to nil... unmarshaling a JSON null into any other Go type has no effect on the value and produces no error." Runtime probe: `absent=<nil> null=<nil> empty=<ptr "">`. Structural checker OK; behavior test green. Minor non-blocking note: the See Also clause for `go-data-json-use-number` ("the same any-decoding trap") is loose - the pointer rule is about struct fields, not `any` decoding. |
| go-data-json-text-keys | verified | Why now matches the baseline probe exactly: non-empty `map[Tenant]int` -> `*json.UnsupportedValueError` ("json: unsupported value: jsontext: object member name must be a string after offset 2"); empty map -> `{}` with no error. YAML valid, structural checker OK; TextMarshaler round-trip test green. |

Re-check evidence: all 21 batch-7 files pass the structural checker; `node dist/rules/cli.js validate --lang go --no-compile` reports zero errors for the batch (only the pre-existing non-blocking hedging warning on `gen-write-code-first`); `go build ./...` and `go vet ./...` clean; the six affected behavior tests (`r12*`, `r14*`, `r18*`) green under `-timeout 60s`.

Final counts: **verified 21/21 (gen 9/9, data 12/12); rejected 0.** All three fixed rules flipped to `status: verified`; no `status: draft` remains in the batch.
