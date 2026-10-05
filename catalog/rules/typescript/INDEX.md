# TypeScript Rules Index

Baseline: latest
Rules: 259 (verified: 259)

_Batches: 1 `err` (15), 2 `type` (16) and `async` (14), 3 `test` (12) and `perf` (12), 4 `api` (16) and `sec` (13), 5 `mod` (12) and `lint` (12), 6 `anti` (12) and `style` (12), 7 `data` (12) and `proj` (7), 8 `conc` (12), `const` (7), and `conv` (9), 9 `io` (9), `num` (9), and `pat` (8), 10 `doc` (6), `ffi` (6), `mem` (7), `net` (7), `obs` (6), and `ui` (8). All 259 planned rules are authored; per-rule verification status is in each file._

## anti - Anti-patterns (12)

- [anti-arguments-object](anti-arguments-object.md) - Take variadic arguments as rest parameters, not the arguments object
- [anti-array-constructor](anti-array-constructor.md) - Create arrays with literals instead of the Array constructor
- [anti-array-delete](anti-array-delete.md) - Remove array elements with splice, not delete
- [anti-async-executor](anti-async-executor.md) - Never pass an async function to the Promise constructor
- [anti-cond-assign](anti-cond-assign.md) - Do not assign inside a condition
- [anti-for-in-array](anti-for-in-array.md) - Iterate arrays with for...of, not for...in
- [anti-has-own](anti-has-own.md) - Check own properties with Object.hasOwn
- [anti-nested-ternary](anti-nested-ternary.md) - Do not nest ternary expressions
- [anti-no-var](anti-no-var.md) - Declare variables with let or const, never var
- [anti-param-reassign](anti-param-reassign.md) - Do not reassign function parameters
- [anti-sort-mutation](anti-sort-mutation.md) - Copy an array before sorting it in place
- [anti-strict-equality](anti-strict-equality.md) - Compare with strict equality, not loose equality

## api - API design (16)

- [api-deprecate-with-jsdoc](api-deprecate-with-jsdoc.md) - Mark superseded exports with @deprecated and the replacement
- [api-explicit-return-types](api-explicit-return-types.md) - Annotate exported function return types
- [api-generic-inference](api-generic-inference.md) - Use the element type as the parameter instead of constraining the container
- [api-immutable-exports](api-immutable-exports.md) - Never export a mutable binding
- [api-interface-for-objects](api-interface-for-objects.md) - Use an interface for exported object shapes consumers may extend
- [api-iterable-params](api-iterable-params.md) - Accept Iterable when you only iterate
- [api-minimal-surface](api-minimal-surface.md) - Export only the symbols consumers need
- [api-modules-over-namespaces](api-modules-over-namespaces.md) - Put each module's API in its own file, not a namespace
- [api-named-exports](api-named-exports.md) - Export named symbols instead of default exports
- [api-no-static-class](api-no-static-class.md) - Use plain functions instead of a class that only holds static helpers
- [api-options-object](api-options-object.md) - Take related options as one typed object
- [api-parameter-properties](api-parameter-properties.md) - Declare injected dependencies as parameter properties
- [api-readonly-fields](api-readonly-fields.md) - Mark a field readonly when only the constructor assigns it
- [api-readonly-returns](api-readonly-returns.md) - Return a readonly collection when callers must not mutate it
- [api-this-return-type](api-this-return-type.md) - Return this from chainable methods so subclasses keep their type
- [api-union-over-overload](api-union-over-overload.md) - Use one union parameter instead of overloads with the same return type

## async - Asynchronous code and promises (14)

- [async-abort-early-check](async-abort-early-check.md) - Check the abort signal between work items so cancellation stops the loop
- [async-abort-listener-cleanup](async-abort-listener-cleanup.md) - Remove abort listeners in finally when the operation finishes
- [async-async-iteration](async-async-iteration.md) - Consume async iterables with for await...of
- [async-await-thenable](async-await-thenable.md) - Await only promises so every await point is real
- [async-fetch-status-check](async-fetch-status-check.md) - Check response.ok before reading a fetch response
- [async-microtask-defer](async-microtask-defer.md) - Defer with queueMicrotask instead of a zero-delay timer
- [async-no-misused-promises](async-no-misused-promises.md) - Do not pass an async callback where a void return is expected
- [async-no-void-silence](async-no-void-silence.md) - Handle promise rejections instead of silencing them with void
- [async-parallelize-independent](async-parallelize-independent.md) - Start independent async work together instead of awaiting in sequence
- [async-promise-constructor](async-promise-constructor.md) - Wrap a callback API in one promise helper, then use async functions
- [async-promise-reject-error](async-promise-reject-error.md) - Reject promises with Error objects, not strings
- [async-race-cancel](async-race-cancel.md) - Cancel the losers of a race once the winner settles
- [async-return-await](async-return-await.md) - Return promises directly, but return await inside try/catch
- [async-timeout-signal](async-timeout-signal.md) - Bound network calls with a timeout signal

## conc - Concurrency and the event loop (12)

- [conc-abort-composition](conc-abort-composition.md) - Combine abort signals with AbortSignal.any
- [conc-interval-cleanup](conc-interval-cleanup.md) - Return a way to stop an interval
- [conc-listener-once](conc-listener-once.md) - Use the once option for one-shot listeners
- [conc-microtask-starvation](conc-microtask-starvation.md) - Do not requeue unbounded work as microtasks
- [conc-no-busy-wait](conc-no-busy-wait.md) - Never spin-wait for another task
- [conc-shared-buffer-isolation](conc-shared-buffer-isolation.md) - Check cross-origin isolation before SharedArrayBuffer
- [conc-shared-memory-atomics](conc-shared-memory-atomics.md) - Update shared memory with Atomics
- [conc-structured-clone-worker](conc-structured-clone-worker.md) - Send plain data to workers, not class instances
- [conc-transfer-buffers](conc-transfer-buffers.md) - Transfer buffers to a worker instead of copying them
- [conc-worker-errors](conc-worker-errors.md) - Handle worker errors where the work starts
- [conc-worker-terminate](conc-worker-terminate.md) - Terminate workers when their work is done
- [conc-yield-long-work](conc-yield-long-work.md) - Yield to the event loop between chunks of long work

## const - Constants and immutability (7)

- [const-deep-freeze](const-deep-freeze.md) - Freeze nested constants deeply
- [const-default-parameter](const-default-parameter.md) - Give optional parameters their default in the signature
- [const-fresh-default](const-fresh-default.md) - Never share a mutable default parameter value
- [const-named-magic](const-named-magic.md) - Name repeated literal values as constants
- [const-object-freeze](const-object-freeze.md) - Freeze exported constant objects and arrays
- [const-readonly-props](const-readonly-props.md) - Mark data-model properties readonly
- [const-static-readonly](const-static-readonly.md) - Mark class constants static readonly

## conv - Conversions and coercion (9)

- [conv-integer-check](conv-integer-check.md) - Test whole numbers with Number.isInteger
- [conv-intl-number](conv-intl-number.md) - Format numbers for display with Intl.NumberFormat
- [conv-iterable-to-array](conv-iterable-to-array.md) - Convert iterables with Array.from
- [conv-locale-compare](conv-locale-compare.md) - Sort user-visible strings with localeCompare
- [conv-number-explicit](conv-number-explicit.md) - Convert to number with Number, not unary plus
- [conv-number-validate](conv-number-validate.md) - Check Number's result before using it
- [conv-parseint-radix](conv-parseint-radix.md) - Pass an explicit radix to parseInt
- [conv-regexp-test](conv-regexp-test.md) - Test for a match with RegExp.test
- [conv-string-explicit](conv-string-explicit.md) - Convert to string with String, not empty-string concatenation

## data - Data modeling and serialization (12)

- [data-date-iso](data-date-iso.md) - Serialize timestamps as ISO 8601 UTC strings
- [data-date-parse-check](data-date-parse-check.md) - Reject date strings that do not parse
- [data-error-serialization](data-error-serialization.md) - Serialize errors with explicit fields
- [data-explicit-wire-shape](data-explicit-wire-shape.md) - Serialize an explicit wire shape, not the domain object
- [data-json-canonical](data-json-canonical.md) - Canonicalize JSON before hashing or signing it
- [data-json-non-finite](data-json-non-finite.md) - Reject non-finite numbers before serializing
- [data-json-special-values](data-json-special-values.md) - Convert Map, Set, and BigInt before JSON.stringify
- [data-key-order](data-key-order.md) - Keep ordered data in arrays, not object keys
- [data-large-integers](data-large-integers.md) - Send integers beyond the safe range as strings
- [data-literal-union](data-literal-union.md) - Type a closed set of wire values as a literal union
- [data-null-not-undefined](data-null-not-undefined.md) - Represent absent wire values as null, not an optional property
- [data-unicode-normalize](data-unicode-normalize.md) - Normalize Unicode text before storing or comparing it

## doc - Documentation and comments (6)

- [doc-comment-internal](doc-comment-internal.md) - Keep internal notes as line comments
- [doc-example](doc-example.md) - Show usage in an example block
- [doc-fileoverview](doc-fileoverview.md) - Open a module with a file overview
- [doc-jsdoc-public](doc-jsdoc-public.md) - Document exported symbols with JSDoc
- [doc-jsdoc-tags](doc-jsdoc-tags.md) - Record parameter meaning with JSDoc tags
- [doc-see-link](doc-see-link.md) - Connect related symbols with JSDoc links

## err - Error handling (15)

- [err-abort-cancellation](err-abort-cancellation.md) - Treat abort as cancellation: stop work, skip retries, and keep it out of error logs
- [err-aggregate-errors](err-aggregate-errors.md) - Report every parallel failure in one AggregateError instead of only the first
- [err-async-propagate](err-async-propagate.md) - Await or return every promise so its rejection reaches a handler
- [err-boundary-parse](err-boundary-parse.md) - Validate external input at the boundary and pass typed values inward
- [err-catch-unknown](err-catch-unknown.md) - Treat caught values as unknown and narrow before reading them
- [err-domain-error-class](err-domain-error-class.md) - Model domain failures as named Error subclasses with stable fields
- [err-error-code](err-error-code.md) - Branch on error class and a stable code, never on message text
- [err-finally-cleanup](err-finally-cleanup.md) - Release resources in finally so every exit path cleans up
- [err-log-once](err-log-once.md) - Log a failure once where it is handled and propagate it elsewhere
- [err-no-process-exit](err-no-process-exit.md) - Set process.exitCode or throw instead of calling process.exit mid-operation
- [err-no-swallow](err-no-swallow.md) - Handle, wrap, or rethrow every caught error; never drop it
- [err-result-union](err-result-union.md) - Return a discriminated result for expected failures and reserve throw for defects
- [err-retry-idempotent](err-retry-idempotent.md) - Retry only idempotent operations, with bounded attempts and a delay
- [err-throw-error-only](err-throw-error-only.md) - Throw only Error instances so failures carry a stack and a name
- [err-wrap-with-cause](err-wrap-with-cause.md) - Wrap caught errors with cause instead of replacing or stringifying them

## ffi - Interop (WASM, Node-API, untyped JS) (6)

- [ffi-napi-status](ffi-napi-status.md) - Check the status of every Node-API call
- [ffi-wasm-buffer-grow](ffi-wasm-buffer-grow.md) - Re-read the WASM buffer after growing memory
- [ffi-wasm-imports-object](ffi-wasm-imports-object.md) - Provide every declared import when instantiating
- [ffi-wasm-instantiate-error](ffi-wasm-instantiate-error.md) - Report which phase of WASM loading failed
- [ffi-wasm-memory-bounds](ffi-wasm-memory-bounds.md) - Check offsets against the WASM memory length
- [ffi-wasm-trap](ffi-wasm-trap.md) - Treat a WASM trap as a failure at the call site

## io - I/O, files, and streams (9)

- [io-backpressure](io-backpressure.md) - Respect writable stream backpressure
- [io-mkdir-recursive](io-mkdir-recursive.md) - Create directories with recursive true
- [io-no-exists-check](io-no-exists-check.md) - Read the file instead of checking that it exists
- [io-path-join](io-path-join.md) - Join filesystem paths with the path module
- [io-pipeline](io-pipeline.md) - Connect streams with pipeline, not pipe
- [io-stream-chunks](io-stream-chunks.md) - Process large inputs as streams, not whole files
- [io-text-decode](io-text-decode.md) - Decode bytes with an explicit text encoding
- [io-url-encode](io-url-encode.md) - Build query strings with URLSearchParams
- [io-write-exclusive](io-write-exclusive.md) - Create-once with the wx flag

## lint - Linting, formatting, and type checking (12)

- [lint-boolean-literal-compare](lint-boolean-literal-compare.md) - Compare booleans directly instead of against true or false
- [lint-consistent-return](lint-consistent-return.md) - Return a value on every path instead of mixing bare and valued returns
- [lint-no-inferrable-types](lint-no-inferrable-types.md) - Drop annotations the initializer already provides
- [lint-no-this-alias](lint-no-this-alias.md) - Use arrow functions instead of aliasing this
- [lint-no-unsafe-assignment](lint-no-unsafe-assignment.md) - Do not assign any values into typed variables
- [lint-no-unsafe-return](lint-no-unsafe-return.md) - Do not return any values from typed functions
- [lint-no-unnecessary-condition](lint-no-unnecessary-condition.md) - Remove conditions the types prove are always true or false
- [lint-no-unnecessary-type-assertion](lint-no-unnecessary-type-assertion.md) - Remove type assertions that do not change the type
- [lint-no-unused-vars](lint-no-unused-vars.md) - Delete bindings the code never reads
- [lint-prefer-nullish-coalescing](lint-prefer-nullish-coalescing.md) - Use ?? for fallbacks so only nullish values are replaced
- [lint-prefer-optional-chain](lint-prefer-optional-chain.md) - Use ?. instead of && chains for nullable property access
- [lint-strict-boolean-expressions](lint-strict-boolean-expressions.md) - Compare nullable and numeric values explicitly in conditions

## mem - Memory and lifetimes (7)

- [mem-bounded-cache](mem-bounded-cache.md) - Bound the size of long-lived caches
- [mem-finalization-fallback](mem-finalization-fallback.md) - Release resources explicitly, not in a finalizer
- [mem-object-url-revoke](mem-object-url-revoke.md) - Revoke object URLs when done
- [mem-typed-array-view](mem-typed-array-view.md) - Window buffers with subarray, not slice
- [mem-weak-cache](mem-weak-cache.md) - Cache per-object data in a WeakMap
- [mem-weakref-deref](mem-weakref-deref.md) - Handle the undefined from WeakRef.deref
- [mem-weakset-membership](mem-weakset-membership.md) - Track object membership with a WeakSet

## mod - Modules and packages (12)

- [mod-erasable-syntax](mod-erasable-syntax.md) - Keep TypeScript syntax erasable for runtime type stripping
- [mod-file-extensions](mod-file-extensions.md) - Import relative ESM paths with their file extension
- [mod-import-attributes](mod-import-attributes.md) - Load JSON modules with a type attribute
- [mod-import-meta-locate](mod-import-meta-locate.md) - Locate data files relative to the module, not the working directory
- [mod-lazy-dynamic-import](mod-lazy-dynamic-import.md) - Load optional or heavy modules with dynamic import
- [mod-namespace-imports](mod-namespace-imports.md) - Import the symbols you use by name, not a namespace for one call
- [mod-no-require](mod-no-require.md) - Use ES imports instead of require in module code
- [mod-node-builtin-prefix](mod-node-builtin-prefix.md) - Import Node built-ins with the node: prefix
- [mod-public-entry](mod-public-entry.md) - Import packages through their public entry point
- [mod-subpath-imports](mod-subpath-imports.md) - Alias internal modules with package imports, not deep relative paths
- [mod-type-only-exports](mod-type-only-exports.md) - Mark type-only re-exports with the type keyword
- [mod-type-only-imports](mod-type-only-imports.md) - Mark type-only imports with the type keyword

## net - Networking and HTTP clients (7)

- [net-accept-json](net-accept-json.md) - Ask for the representation you can parse
- [net-conditional-get](net-conditional-get.md) - Revalidate cached resources with If-None-Match
- [net-conditional-update](net-conditional-update.md) - Guard updates with If-Match
- [net-content-type](net-content-type.md) - Declare the body's media type with Content-Type
- [net-form-body](net-form-body.md) - Send form data with URLSearchParams
- [net-retry-after](net-retry-after.md) - Honor Retry-After before retrying a request
- [net-websocket-close](net-websocket-close.md) - Return a way to close the socket you open

## num - Numerics (9)

- [num-bitwise-32](num-bitwise-32.md) - Do not truncate with bitwise operators
- [num-division-zero](num-division-zero.md) - Guard division by a length or count
- [num-epsilon-compare](num-epsilon-compare.md) - Compare computed floats with a tolerance
- [num-exponent-operator](num-exponent-operator.md) - Write powers with the exponentiation operator
- [num-money-minor-units](num-money-minor-units.md) - Store money in integer minor units
- [num-nan-test](num-nan-test.md) - Test NaN with Number.isNaN, not global isNaN
- [num-parseint-decimal](num-parseint-decimal.md) - Read decimal amounts with Number, not parseInt
- [num-round-minor-units](num-round-minor-units.md) - Round once when converting to minor units
- [num-safe-integer](num-safe-integer.md) - Reject integers outside the safe range

## obs - Observability and logging (6)

- [obs-interaction-id](obs-interaction-id.md) - Tag related log entries with an interaction identifier
- [obs-log-error-object](obs-log-error-object.md) - Log the Error object, not its message
- [obs-measure-duration](obs-measure-duration.md) - Record operation durations with performance marks
- [obs-no-console-in-lib](obs-no-console-in-lib.md) - Do not write to the console from library code
- [obs-no-pii](obs-no-pii.md) - Keep secrets and personal data out of logs
- [obs-structured-log](obs-structured-log.md) - Log structured fields, not formatted strings

## pat - Patterns and control flow (8)

- [pat-assertion-function](pat-assertion-function.md) - Encode invariants as assertion functions
- [pat-custom-iterable](pat-custom-iterable.md) - Make custom collections iterable
- [pat-filter-not-splice](pat-filter-not-splice.md) - Build filtered arrays instead of splicing while iterating
- [pat-for-of-map](pat-for-of-map.md) - Iterate maps with for...of, not forEach
- [pat-generator-lazy](pat-generator-lazy.md) - Produce sequences lazily with generators
- [pat-iterator-consumer](pat-iterator-consumer.md) - Consume iterables with for...of, not manual next calls
- [pat-reduce-initial-value](pat-reduce-initial-value.md) - Pass the initial value to reduce
- [pat-type-predicate](pat-type-predicate.md) - Return type predicates from guards

## perf - Performance (12)

- [perf-batch-dom-io](perf-batch-dom-io.md) - Read layout values before writing styles, never interleaved
- [perf-early-exit](perf-early-exit.md) - Test membership with some or find so the scan stops early
- [perf-map-churn](perf-map-churn.md) - Use a Map for key sets that change frequently
- [perf-measure-first](perf-measure-first.md) - Measure a hot path with performance.now before optimizing it
- [perf-memoize-pure](perf-memoize-pure.md) - Cache a pure function's result in a Map when inputs recur
- [perf-raf-batch](perf-raf-batch.md) - Schedule visual updates with requestAnimationFrame
- [perf-regexp-hoist](perf-regexp-hoist.md) - Compile regular expressions once, not on every call
- [perf-set-membership](perf-set-membership.md) - Look up membership in a Set instead of scanning an array
- [perf-sort-comparator](perf-sort-comparator.md) - Pass an explicit comparator to sort
- [perf-structured-clone](perf-structured-clone.md) - Clone with structuredClone instead of a JSON round-trip
- [perf-typed-arrays](perf-typed-arrays.md) - Store bulk numeric data in typed arrays
- [perf-worker-offload](perf-worker-offload.md) - Run CPU-bound work in a worker so the main thread stays responsive

## proj - Project and build configuration (7)

- [proj-isolated-declarations](proj-isolated-declarations.md) - Annotate exported declarations for isolated declaration emit
- [proj-lib-runtime](proj-lib-runtime.md) - Scope lib to the runtime so foreign globals fail
- [proj-no-fallthrough-cases](proj-no-fallthrough-cases.md) - Break every switch case instead of falling through
- [proj-no-implicit-override](proj-no-implicit-override.md) - Mark overriding members with the override keyword
- [proj-no-implicit-returns](proj-no-implicit-returns.md) - Require a return on every code path
- [proj-no-property-access-from-index-signature](proj-no-property-access-from-index-signature.md) - Access index-signature properties with brackets
- [proj-no-unreachable-code](proj-no-unreachable-code.md) - Reject unreachable code

## sec - Security (13)

- [sec-error-response-generic](sec-error-response-generic.md) - Return a generic error body to clients
- [sec-fetch-credentials](sec-fetch-credentials.md) - Send credentials only same-origin with fetch
- [sec-no-eval](sec-no-eval.md) - Never execute code from a string
- [sec-no-innerhtml](sec-no-innerhtml.md) - Write untrusted text with textContent, not innerHTML
- [sec-no-merge-untrusted](sec-no-merge-untrusted.md) - Build option objects from known keys, not merged input
- [sec-no-secrets-in-url](sec-no-secrets-in-url.md) - Keep secrets out of URLs; put them in headers or the body
- [sec-no-user-regex](sec-no-user-regex.md) - Escape user input before building a regular expression
- [sec-postmessage-origin](sec-postmessage-origin.md) - Check event.origin before trusting a message
- [sec-postmessage-target](sec-postmessage-target.md) - Pass an exact target origin to postMessage
- [sec-secrets-from-env](sec-secrets-from-env.md) - Load secrets from the environment or a secret store, never source literals
- [sec-secure-random](sec-secure-random.md) - Generate tokens with crypto.getRandomValues, not Math.random
- [sec-timing-safe-compare](sec-timing-safe-compare.md) - Compare secrets with a constant-time function, not equality
- [sec-tls-only](sec-tls-only.md) - Send credentials only over TLS

## style - Style and conventions (12)

- [style-array-type](style-array-type.md) - Write simple array types as T[]
- [style-arrow-callbacks](style-arrow-callbacks.md) - Pass arrow functions as callbacks
- [style-const-default](style-const-default.md) - Declare variables with const by default
- [style-curly-braces](style-curly-braces.md) - Brace every control statement body
- [style-dot-notation](style-dot-notation.md) - Access properties with dot notation when the name is known
- [style-generic-constructors](style-generic-constructors.md) - Put generic arguments on the constructor call, not the annotation
- [style-member-ordering](style-member-ordering.md) - Order class members fields first, then constructor, then methods
- [style-method-signature](style-method-signature.md) - Declare callable properties with function-type syntax
- [style-naming-convention](style-naming-convention.md) - Name values in camelCase and types in PascalCase
- [style-no-else-return](style-no-else-return.md) - Drop else after a branch that returns
- [style-object-spread](style-object-spread.md) - Copy objects with spread, not Object.assign
- [style-template-strings](style-template-strings.md) - Interpolate with template literals, not string concatenation

## test - Testing (12)

- [test-assert-helper-throws](test-assert-helper-throws.md) - Make custom assertion helpers throw on failure
- [test-assert-rejects](test-assert-rejects.md) - Assert rejections with a rejection assertion, not a try/catch flag
- [test-await-async](test-await-async.md) - Await async work inside tests so failures fail the test
- [test-injected-clock](test-injected-clock.md) - Read the current time through an injected clock so tests control it
- [test-isolated-state](test-isolated-state.md) - Give each test its own state instead of sharing module fixtures
- [test-mock-restore](test-mock-restore.md) - Reset mocks and timers after each test
- [test-no-focus](test-no-focus.md) - Do not commit focused tests that skip the rest of the suite
- [test-plan-assertions](test-plan-assertions.md) - Declare the expected assertion count so a silent test fails
- [test-public-api](test-public-api.md) - Assert through the public API instead of private state
- [test-skip-reason](test-skip-reason.md) - Skip a test with a reason so the suite records why
- [test-typed-fixtures](test-typed-fixtures.md) - Build complete typed fixtures instead of casting partial objects
- [test-wait-for](test-wait-for.md) - Wait for the condition instead of sleeping a fixed time

## type - Types and modeling (16)

- [type-const-assertion](type-const-assertion.md) - Mark literal tables as const so their values keep literal types
- [type-derive-utility-types](type-derive-utility-types.md) - Derive related types with Pick, Omit, and Partial from one source
- [type-discriminated-union-state](type-discriminated-union-state.md) - Model mutually exclusive states as a discriminated union, not optional fields
- [type-exhaustive-union](type-exhaustive-union.md) - Handle every union member and assert never in the default case
- [type-generic-constraint](type-generic-constraint.md) - Constrain a type parameter to the capability the body uses
- [type-generic-necessity](type-generic-necessity.md) - Add a type parameter only when it relates two positions
- [type-indexed-access-guard](type-indexed-access-guard.md) - Treat indexed reads as possibly missing and guard before use
- [type-no-empty-object](type-no-empty-object.md) - Replace empty object types with unknown or a real shape
- [type-no-explicit-any](type-no-explicit-any.md) - Use unknown or a precise type instead of any
- [type-no-function-type](type-no-function-type.md) - Replace the Function type with an explicit call signature
- [type-no-non-null-assertion](type-no-non-null-assertion.md) - Narrow nullable values instead of asserting them non-null
- [type-no-ts-ignore](type-no-ts-ignore.md) - Use ts-expect-error with a reason instead of ts-ignore
- [type-no-wrapper-types](type-no-wrapper-types.md) - Use lowercase primitive types instead of wrapper object types
- [type-optional-not-undefined](type-optional-not-undefined.md) - Omit optional properties instead of assigning undefined to them
- [type-readonly-inputs](type-readonly-inputs.md) - Type read-only parameters as readonly so callers can pass frozen data
- [type-unsafe-cast](type-unsafe-cast.md) - Narrow with guards instead of asserting a narrower type

## ui - DOM and UI typing (8)

- [ui-classlist](ui-classlist.md) - Toggle classes with classList
- [ui-custom-event](ui-custom-event.md) - Type CustomEvent payloads
- [ui-dataset](ui-dataset.md) - Read data attributes through dataset
- [ui-document-fragment](ui-document-fragment.md) - Insert many nodes with a document fragment
- [ui-form-narrow](ui-form-narrow.md) - Narrow form controls with instanceof
- [ui-live-properties](ui-live-properties.md) - Read live state from element properties
- [ui-passive-listener](ui-passive-listener.md) - Mark scroll-driving listeners passive
- [ui-scoped-query](ui-scoped-query.md) - Scope DOM queries to the component root
