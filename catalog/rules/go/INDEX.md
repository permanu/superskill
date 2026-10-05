# Go Rules Index

Baseline: latest
Rules: 264 (verified: 264)

Batches 1-11 author the complete plan (264 rules after one duplicate was removed in verification); per-category status is tracked in [categories.md](categories.md).

## anti - Anti-patterns and folklore (10)

- [anti-context-values](anti-context-values.md) - do not pass function parameters through context values
- [anti-http-body-close](anti-http-body-close.md) - always close the response body after a successful request
- [anti-http-default-client](anti-http-default-client.md) - do not use http.Get and the default client in services
- [anti-log-fatal-library](anti-log-fatal-library.md) - never call log.Fatal from library code
- [anti-map-iteration-order](anti-map-iteration-order.md) - never rely on map iteration order
- [anti-nil-channel](anti-nil-channel.md) - make channels before sending, receiving, or closing
- [anti-nil-map-write](anti-nil-map-write.md) - initialize a map before writing to it
- [anti-time-equal](anti-time-equal.md) - compare times with Equal, not the == operator
- [anti-time-layout](anti-time-layout.md) - write time layouts as the reference time, not strftime patterns
- [anti-unchecked-type-assertion](anti-unchecked-type-assertion.md) - use the comma-ok form of type assertions

## api - API and package design (15)

- [api-constructors-new](api-constructors-new.md) - constructors are New and return fully initialized values
- [api-deprecate-marker](api-deprecate-marker.md) - mark deprecated APIs with a Deprecated paragraph
- [api-doc-errors](api-doc-errors.md) - document the error conditions callers may test for
- [api-doc-exported](api-doc-exported.md) - document every exported declaration starting with its name
- [api-error-last](api-error-last.md) - return the error as the last result parameter
- [api-init-minimal](api-init-minimal.md) - keep init side-effect free and move config errors to main
- [api-keyed-struct-literals](api-keyed-struct-literals.md) - key fields for composite literals of external types
- [api-must-constructors](api-must-constructors.md) - use Must constructors for constant inputs
- [api-nil-vs-empty-slice](api-nil-vs-empty-slice.md) - do not make nil and empty slices mean different things
- [api-option-defaults](api-option-defaults.md) - document the default of every optional option field
- [api-options-struct](api-options-struct.md) - group long argument lists into an option struct
- [api-pointer-to-interface](api-pointer-to-interface.md) - pass interface values directly, not pointers to them
- [api-return-zero-on-error](api-return-zero-on-error.md) - return zero values with an error unless partial results are documented
- [api-unexport-unsupported](api-unexport-unsupported.md) - unexport helpers you are not prepared to support
- [api-zero-value-useful](api-zero-value-useful.md) - design types so the zero value is ready to use

## conc - Concurrency (16)

- [conc-atomics-not-locks](conc-atomics-not-locks.md) - mutex for compound invariants, atomics for counters
- [conc-bounded-parallelism](conc-bounded-parallelism.md) - cap goroutines with a semaphore or worker pool
- [conc-close-sender](conc-close-sender.md) - close channels only from the sender
- [conc-context-not-in-struct](conc-context-not-in-struct.md) - pass context per call, never store it
- [conc-done-broadcast](conc-done-broadcast.md) - broadcast completion by closing a channel
- [conc-goroutine-lifetime](conc-goroutine-lifetime.md) - every goroutine needs a known exit path
- [conc-loopvar-no-copy](conc-loopvar-no-copy.md) - per-iteration loop variables need no copy
- [conc-mutex-defer-unlock](conc-mutex-defer-unlock.md) - unlock with defer on every return path
- [conc-mutex-map](conc-mutex-map.md) - guard built-in maps with a mutex
- [conc-once-init](conc-once-init.md) - one-time initialization with sync.OnceValue
- [conc-select-cancel](conc-select-cancel.md) - select on ctx.Done() at every blocking point
- [conc-sync-function](conc-sync-function.md) - prefer synchronous functions
- [conc-sync-map-workloads](conc-sync-map-workloads.md) - sync.Map only for its documented workloads
- [conc-synctest](conc-synctest.md) - test goroutines with synctest, not sleeps
- [conc-typed-atomics](conc-typed-atomics.md) - typed atomic values over raw functions
- [conc-waitgroup-go](conc-waitgroup-go.md) - launch tracked goroutines with WaitGroup.Go

## const - Constants and enums (6)

- [const-bitflags](const-bitflags.md) - build combinable flags with 1 << iota
- [const-iota-scaling](const-iota-scaling.md) - derive scaled constants from iota instead of repeating numbers
- [const-iota-skip](const-iota-skip.md) - reserve iota values with the blank identifier
- [const-not-var](const-not-var.md) - use const for values that never change
- [const-typed-enum](const-typed-enum.md) - type an enum built with iota
- [const-untyped-flexible](const-untyped-flexible.md) - leave constants untyped unless the type is part of the API

## conv - Conventions and idioms (5)

- [conv-chan-direction](conv-chan-direction.md) - give channels a direction in function signatures
- [conv-defer-close](conv-defer-close.md) - defer Close immediately after a successful open
- [conv-map-comma-ok](conv-map-comma-ok.md) - test map membership with the comma-ok form
- [conv-short-var-decl](conv-short-var-decl.md) - prefer := for new variables with a non-zero value
- [conv-slices-over-arrays](conv-slices-over-arrays.md) - prefer slices over arrays in function signatures

## data - Data and encoding (12)

- [data-csv-flush-error](data-csv-flush-error.md) - check csv.Writer.Error after Flush
- [data-csv-reuse-record](data-csv-reuse-record.md) - turn on ReuseRecord when CSV rows are copied immediately
- [data-json-binary-base64](data-json-binary-base64.md) - carry binary data as []byte so JSON encodes it as base64
- [data-json-encoder-stream](data-json-encoder-stream.md) - stream sequences of JSON values with json.Encoder
- [data-json-null-vs-absent](data-json-null-vs-absent.md) - use a pointer when null must be distinguishable from absent
- [data-json-omitempty-vs-omitzero](data-json-omitempty-vs-omitzero.md) - use omitzero for bool, number, pointer, and interface fields
- [data-json-raw-defer](data-json-raw-defer.md) - defer nested payload decoding with json.RawMessage
- [data-json-tags-explicit](data-json-tags-explicit.md) - tag JSON fields explicitly instead of relying on Go field names
- [data-json-text-keys](data-json-text-keys.md) - implement TextMarshaler for structs used as JSON map keys
- [data-json-unknown-fields](data-json-unknown-fields.md) - reject unknown JSON fields at strict boundaries
- [data-json-use-number](data-json-use-number.md) - decode unknown numbers with UseNumber to keep precision
- [data-time-rfc3339](data-time-rfc3339.md) - keep time.Time on the wire instead of formatting it by hand

## doc - Documentation and comments (6)

- [doc-behavior-not-implementation](doc-behavior-not-implementation.md) - document what a function does, not how it is implemented
- [doc-concurrency-note](doc-concurrency-note.md) - state when a type is safe for concurrent use
- [doc-field-comments](doc-field-comments.md) - explain exported struct fields in comments
- [doc-no-html](doc-no-html.md) - write doc comments in the supported syntax, not HTML
- [doc-no-nested-lists](doc-no-nested-lists.md) - avoid nested lists in doc comments
- [doc-reports-whether](doc-reports-whether.md) - describe boolean results with reports whether

## err - Error handling (16)

- [err-contract-minimal](err-contract-minimal.md) - expose only the error conditions the API promises
- [err-context-first-param](err-context-first-param.md) - context.Context first, threaded through blocking calls
- [err-context-preserve](err-context-preserve.md) - keep the identity of cancellation in returned errors
- [err-goroutine-collect](err-goroutine-collect.md) - send goroutine errors to the caller and merge them
- [err-join](err-join.md) - combine independent failures with errors.Join
- [err-log-once](err-log-once.md) - log each error once at the boundary that owns the response
- [err-match-by-is-as](err-match-by-is-as.md) - match errors with errors.Is and errors.As, not equality
- [err-message-lowercase](err-message-lowercase.md) - error strings start lowercase, end without punctuation
- [err-no-ignore](err-no-ignore.md) - handle every error or document why discarding is safe
- [err-no-typed-nil](err-no-typed-nil.md) - never return a typed nil pointer through an error interface
- [err-panic-programmer-error](err-panic-programmer-error.md) - panic only for bugs and invariants, return errors otherwise
- [err-partial-result](err-partial-result.md) - return the partial result alongside the error
- [err-recover-translate](err-recover-translate.md) - recover your own panics at the boundary, re-panic the rest
- [err-retry-transient](err-retry-transient.md) - retry only classified transient errors of idempotent work
- [err-wrap-once](err-wrap-once.md) - add context once, never repeat what the inner error says
- [err-wrap-with-w](err-wrap-with-w.md) - wrap with %w to add context without breaking the chain

## ffi - cgo and FFI (3)

- [ffi-c-types-exported](ffi-c-types-exported.md) - keep C types out of the exported API
- [ffi-cstring-free](ffi-cstring-free.md) - free every C.CString buffer with C.free
- [ffi-passing-pointers](ffi-passing-pointers.md) - let C keep a Go pointer only while the memory is pinned

## gen - Generics (9)

- [gen-cmp-ordered](gen-cmp-ordered.md) - constrain ordered values with cmp.Ordered, not a hand-written union
- [gen-containers](gen-containers.md) - parameterize general-purpose data structures over their element type
- [gen-differing-impls-interface](gen-differing-impls-interface.md) - use an interface when the implementation differs per type
- [gen-generic-methods](gen-generic-methods.md) - put a generic operation on its type as a method, not a package-level function
- [gen-inference](gen-inference.md) - let type inference supply type arguments at call sites
- [gen-named-slice-constraint](gen-named-slice-constraint.md) - constrain slice helpers with ~[]E so named slice types keep their identity
- [gen-prefer-functions](gen-prefer-functions.md) - prefer a comparison function over a method constraint
- [gen-stdlib-helpers](gen-stdlib-helpers.md) - use the slices and maps helpers before writing generic loops
- [gen-write-code-first](gen-write-code-first.md) - add type parameters when the same code repeats for different types

## iface - Interfaces (12)

- [iface-accept-narrow](iface-accept-narrow.md) - accept the narrowest interface the function uses
- [iface-canonical-name](iface-canonical-name.md) - name converters String, not ToString
- [iface-compile-assert](iface-compile-assert.md) - prove interface satisfaction at compile time
- [iface-consumer-defined](iface-consumer-defined.md) - define interfaces where they are consumed
- [iface-interface-over-typeparam](iface-interface-over-typeparam.md) - interface parameter over type parameter
- [iface-no-mock-only](iface-no-mock-only.md) - no producer-side interfaces just for mocks
- [iface-not-premature](iface-not-premature.md) - no interface before a real consumer
- [iface-optional-capability](iface-optional-capability.md) - assert for optional capabilities
- [iface-receivers-consistent](iface-receivers-consistent.md) - one receiver kind per type
- [iface-seal-unexported](iface-seal-unexported.md) - seal reserved interfaces with an unexported method
- [iface-small-compose](iface-small-compose.md) - compose small interfaces, not one wide one
- [iface-stringer-no-recursion](iface-stringer-no-recursion.md) - String must not recurse into itself

## io - I/O and streams (7)

- [io-discard](io-discard.md) - discard output with io.Discard instead of a custom sink
- [io-eof-not-error](io-eof-not-error.md) - treat io.EOF as the end of input, not a failure
- [io-limit-reader](io-limit-reader.md) - bound untrusted reads with io.LimitReader
- [io-nop-closer](io-nop-closer.md) - wrap a closeless reader with io.NopCloser
- [io-read-all](io-read-all.md) - read a whole stream with io.ReadAll
- [io-read-full](io-read-full.md) - read an exact length with io.ReadFull
- [io-seek-whence](io-seek-whence.md) - pass io.SeekStart, io.SeekCurrent, or io.SeekEnd as whence

## lint - Static analysis (10)

- [lint-copylocks](lint-copylocks.md) - never pass a value that contains a mutex
- [lint-errorsas-pointer](lint-errorsas-pointer.md) - pass errors.As a pointer to the target type
- [lint-httpresponse](lint-httpresponse.md) - check the HTTP error before touching the response
- [lint-lostcancel](lint-lostcancel.md) - call every context cancel function on every path
- [lint-printf-verbs](lint-printf-verbs.md) - match every printf verb to its argument type
- [lint-slog-pairs](lint-slog-pairs.md) - pass slog key-value arguments in complete pairs
- [lint-stringintconv](lint-stringintconv.md) - convert numbers to text with strconv
- [lint-structtag](lint-structtag.md) - write struct tags in the key:"value" form
- [lint-unmarshal-pointer](lint-unmarshal-pointer.md) - pass Unmarshal a pointer to the value to fill
- [lint-unreachable](lint-unreachable.md) - remove code that no path can reach

## mem - Memory and allocations (14)

- [mem-append-alias](mem-append-alias.md) - never append to a slice whose backing array you do not own
- [mem-avoid-boxing](mem-avoid-boxing.md) - keep hot values out of any
- [mem-bench-alloc](mem-bench-alloc.md) - measure allocations with ReportAllocs
- [mem-clip-capacity](mem-clip-capacity.md) - clip capacity when returning a subslice
- [mem-map-clear](mem-map-clear.md) - empty maps with clear, not a delete loop
- [mem-maps-clone](mem-maps-clone.md) - clone maps before exposing them
- [mem-min-max](mem-min-max.md) - use the min and max builtins
- [mem-pass-values](mem-pass-values.md) - pass small values instead of pointers
- [mem-slice-preallocate](mem-slice-preallocate.md) - preallocate slices when the size is known
- [mem-slices-clone](mem-slices-clone.md) - clone slices before handing them to callers
- [mem-slices-sort](mem-slices-sort.md) - sort with slices.Sort and SortFunc
- [mem-strings-builder](mem-strings-builder.md) - build strings with strings.Builder
- [mem-strings-cut](mem-strings-cut.md) - split strings with strings.Cut
- [mem-sync-pool](mem-sync-pool.md) - reuse temporary buffers with sync.Pool

## mod - Modules and tooling (14)

- [mod-go-install-version](mod-go-install-version.md) - install tools with go install pkg@version
- [mod-go-sum-commit](mod-go-sum-commit.md) - commit go.sum and regenerate it with go mod tidy
- [mod-module-path-location](mod-module-path-location.md) - make the module path name where the code lives
- [mod-mvs-minimums](mod-mvs-minimums.md) - treat require versions as minimums, not pins
- [mod-private-modules](mod-private-modules.md) - mark private module paths with GOPRIVATE
- [mod-pseudo-versions](mod-pseudo-versions.md) - require tagged versions, not pseudo-versions, in releases
- [mod-retract](mod-retract.md) - retract broken releases instead of deleting tags
- [mod-semver-versions](mod-semver-versions.md) - tag releases as vX.Y.Z semantic versions
- [mod-split-shared-packages](mod-split-shared-packages.md) - split packages meant for sharing into their own module
- [mod-tool-directive](mod-tool-directive.md) - track developer tools with the tool directive
- [mod-toolchain-directive](mod-toolchain-directive.md) - treat the toolchain line as a suggestion for the main module
- [mod-unstable-v0](mod-unstable-v0.md) - keep an unsettled API at major version 0
- [mod-vendor-consistency](mod-vendor-consistency.md) - keep vendor/modules.txt consistent with go.mod
- [mod-workspace](mod-workspace.md) - use a go.work workspace for multi-module local development

## net - Networking and HTTP (10)

- [net-handler-context](net-handler-context.md) - run handler work with the request context
- [net-idempotent-retry](net-idempotent-retry.md) - retry only idempotent HTTP methods
- [net-method-constants](net-method-constants.md) - compare request methods with http.Method constants
- [net-mux-patterns](net-mux-patterns.md) - put methods and wildcards in ServeMux patterns
- [net-request-with-context](net-request-with-context.md) - build outbound requests with NewRequestWithContext
- [net-safe-get](net-safe-get.md) - keep GET and HEAD handlers read-only
- [net-server-body-nonnil](net-server-body-nonnil.md) - read the server request body directly; it is never nil
- [net-server-shutdown](net-server-shutdown.md) - shut servers down with Server.Shutdown, not Close
- [net-server-timeouts](net-server-timeouts.md) - set a read header timeout on every http.Server
- [net-status-codes](net-status-codes.md) - write responses with the http.Status constants

## num - Numeric types and constants (6)

- [num-big-exact](num-big-exact.md) - use math/big when values can exceed machine integers
- [num-div-zero](num-div-zero.md) - guard integer division against a zero divisor
- [num-duration](num-duration.md) - multiply raw numbers into time.Duration with a unit constant
- [num-float-to-int](num-float-to-int.md) - range-check floats before converting to integers
- [num-nan-comparison](num-nan-comparison.md) - handle NaN explicitly in float comparisons
- [num-narrowing-overflow](num-narrowing-overflow.md) - range-check values before narrowing integer conversions

## obs - Observability and logging (10)

- [obs-expvar-counter](obs-expvar-counter.md) - expose service counters with expvar
- [obs-log-levels](obs-log-levels.md) - reserve Error for failures that need action
- [obs-log-no-pii](obs-log-no-pii.md) - keep secrets and personal data out of logs
- [obs-log-value-deferred](obs-log-value-deferred.md) - defer expensive log values with LogValuer
- [obs-pprof-explicit](obs-pprof-explicit.md) - register pprof handlers explicitly on an admin mux
- [obs-pprof-labels](obs-pprof-labels.md) - attribute work to its owner with pprof.Do labels
- [obs-slog-context](obs-slog-context.md) - pass the request context to slog
- [obs-slog-handler](obs-slog-handler.md) - configure the slog handler once at startup
- [obs-slog-structured](obs-slog-structured.md) - log key-value attributes with slog
- [obs-slog-with-attrs](obs-slog-with-attrs.md) - bind repeated attributes once with Logger.With

## pat - Design patterns (7)

- [pat-explicit-deps](pat-explicit-deps.md) - carry configuration on values instead of package state
- [pat-fan-in](pat-fan-in.md) - merge channels with a select loop, not sequential drains
- [pat-func-adapters](pat-func-adapters.md) - adapt plain functions with a named function type
- [pat-iterators](pat-iterators.md) - expose sequences as iterators instead of materialized slices
- [pat-method-values](pat-method-values.md) - pass method values instead of wrapping closures
- [pat-pipelines](pat-pipelines.md) - compose streaming work as pipeline stages
- [pat-roundtripper](pat-roundtripper.md) - wrap cross-cutting HTTP behavior in a RoundTripper

## perf - Performance and profiling (13)

- [perf-allocs-per-run](perf-allocs-per-run.md) - pin allocation budgets with testing.AllocsPerRun
- [perf-builder-grow](perf-builder-grow.md) - reserve builder capacity when the size is known
- [perf-builder-reset](perf-builder-reset.md) - reuse a bytes.Buffer across iterations
- [perf-cpu-profile](perf-cpu-profile.md) - capture a CPU profile before changing a hot path
- [perf-fields-seq](perf-fields-seq.md) - iterate split strings with the Seq helpers
- [perf-goroutineleak-test](perf-goroutineleak-test.md) - assert no leaked goroutines with the goroutineleak profile
- [perf-http-client-reuse](perf-http-client-reuse.md) - create HTTP clients and transports once
- [perf-io-copy](perf-io-copy.md) - copy streams with io.Copy
- [perf-json-decoder-stream](perf-json-decoder-stream.md) - decode JSON streams with json.Decoder
- [perf-map-preallocate](perf-map-preallocate.md) - size maps with make when the count is known
- [perf-regexp-compile-once](perf-regexp-compile-once.md) - compile constant regexps once at package level
- [perf-slices-binary-search](perf-slices-binary-search.md) - look up in a sorted slice with slices.BinarySearch
- [perf-trace-task](perf-trace-task.md) - annotate requests with trace.NewTask

## proj - Project layout (8)

- [proj-cmd-layout](proj-cmd-layout.md) - keep commands in cmd/ when the module also exports packages
- [proj-go-directive-minimum](proj-go-directive-minimum.md) - set the go directive to the oldest supported toolchain
- [proj-go-mod-tidy](proj-go-mod-tidy.md) - keep go.mod and go.sum current with go mod tidy
- [proj-internal](proj-internal.md) - put supporting packages under internal by default
- [proj-major-version-suffix](proj-major-version-suffix.md) - end the module path with /vN for major version 2 and higher
- [proj-package-per-directory](proj-package-per-directory.md) - keep one package per directory
- [proj-replace-main-module-only](proj-replace-main-module-only.md) - do not ship replace directives in a published module
- [proj-util-package](proj-util-package.md) - name packages after what they provide, not util or common

## sec - Security (12)

- [sec-cookie-samesite](sec-cookie-samesite.md) - set SameSite on session cookies
- [sec-crypto-rand](sec-crypto-rand.md) - generate tokens and keys with crypto/rand
- [sec-exec-args](sec-exec-args.md) - pass command arguments as arguments, never through a shell
- [sec-html-template](sec-html-template.md) - render HTML with html/template
- [sec-json-v2](sec-json-v2.md) - use encoding/json/v2 for new JSON code
- [sec-maxbytes-body](sec-maxbytes-body.md) - bound request bodies with http.MaxBytesReader
- [sec-md5](sec-md5.md) - never use MD5 or SHA-1 for security-sensitive hashing
- [sec-sql-params](sec-sql-params.md) - pass SQL values as parameters
- [sec-subtle-compare](sec-subtle-compare.md) - compare secrets in constant time
- [sec-tls-minversion](sec-tls-minversion.md) - pin the TLS minimum version explicitly
- [sec-tls-verify](sec-tls-verify.md) - never disable TLS certificate verification
- [sec-valid-path](sec-valid-path.md) - validate user-supplied paths with filepath.IsLocal

## style - Naming and code style (16)

- [style-constant-names](style-constant-names.md) - constants use MixedCaps, not SCREAMING_CASE
- [style-doc-links](style-doc-links.md) - link identifiers in doc comments with square brackets
- [style-dot-import](style-dot-import.md) - never use a dot import outside a test that needs it
- [style-error-flow](style-error-flow.md) - handle errors before the happy path and drop the else
- [style-getter-name](style-getter-name.md) - name accessors after the field, without Get
- [style-gofmt](style-gofmt.md) - format with gofmt instead of hand-aligning
- [style-import-rename](style-import-rename.md) - rename imports only to avoid a collision
- [style-initialisms](style-initialisms.md) - keep initialism case consistent
- [style-literal-braces](style-literal-braces.md) - closing braces of multi-line literals go on their own line
- [style-multiline-condition](style-multiline-condition.md) - extract boolean operands instead of wrapping a condition
- [style-naked-return](style-naked-return.md) - avoid naked returns beyond a few lines
- [style-name-repetition](style-name-repetition.md) - drop context the package or type already provides
- [style-receiver-name](style-receiver-name.md) - name receivers after the type, never this or self
- [style-shadowing](style-shadowing.md) - do not shadow package names or outer variables
- [style-underscore-names](style-underscore-names.md) - no underscores in Go identifiers
- [style-variable-scope](style-variable-scope.md) - scale name length to the scope

## test - Testing and benchmarks (16)

- [test-benchmark-loop](test-benchmark-loop.md) - write benchmarks with b.Loop, not b.N
- [test-cleanup](test-cleanup.md) - release test resources with t.Cleanup in helpers
- [test-example-output](test-example-output.md) - make examples runnable with an Output comment
- [test-failure-message](test-failure-message.md) - fail with function, input, got, and want
- [test-fuzz-seeds](test-fuzz-seeds.md) - seed fuzz targets with edge-case inputs
- [test-fuzz-skip-invalid](test-fuzz-skip-invalid.md) - skip invalid fuzz inputs, fail on invariants
- [test-helper](test-helper.md) - mark test helpers with t.Helper
- [test-keep-going](test-keep-going.md) - prefer t.Error over t.Fatal to report every failure
- [test-no-fatal-in-goroutine](test-no-fatal-in-goroutine.md) - never call Fatal from a spawned goroutine
- [test-parallel-subtests](test-parallel-subtests.md) - mark independent subtests with t.Parallel
- [test-setenv](test-setenv.md) - set environment variables with t.Setenv
- [test-short-skip](test-short-skip.md) - guard slow tests with testing.Short
- [test-subtest-names](test-subtest-names.md) - name subtests for the case they exercise
- [test-t-context](test-t-context.md) - use t.Context for work that stops with the test
- [test-table-driven](test-table-driven.md) - replace copy-pasted checks with a table of named cases
- [test-tempdir](test-tempdir.md) - use t.TempDir for test files

## type - Types and zero values (8)

- [type-definition-over-alias](type-definition-over-alias.md) - define a new type when it must have its own identity
- [type-embed-promote](type-embed-promote.md) - embed a type to promote its methods instead of forwarding them
- [type-interface-comparison](type-interface-comparison.md) - compare concrete types, not any, when values may be incomparable
- [type-make-for-reference](type-make-for-reference.md) - initialize slices, maps, and channels with make, not new
- [type-map-element-copy](type-map-element-copy.md) - update map elements by storing the modified copy back
- [type-named-units](type-named-units.md) - give units their own types so arguments cannot be swapped
- [type-pointer-receiver-mutation](type-pointer-receiver-mutation.md) - use a pointer receiver when the method mutates
- [type-uintptr-not-pointer](type-uintptr-not-pointer.md) - store unsafe.Pointer, not uintptr, when the value must stay a pointer

## ui - CLI and terminal UX (3)

- [ui-args-start-at-one](ui-args-start-at-one.md) - remember that os.Args[0] is the program name
- [ui-flag-package](ui-flag-package.md) - parse flags with the flag package
- [ui-usage-stderr](ui-usage-stderr.md) - report CLI failures on stderr with a non-zero exit
