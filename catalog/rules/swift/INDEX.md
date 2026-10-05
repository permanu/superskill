# Swift Rules Index

Baseline: latest
Rules: 279 (verified: 279)

This index covers batches 1-11 of the planned pack (`err`, `conc`, `type`, `arc`, `api`, `sec`, `obs`, `mem`, `proj`, `doc`, `style`, `async`, `perf`, `lint`, `anti`, `data`, `num`, `conv`, `pat`, `const`, `io`, `net`, `ui`, `ffi`, `macro`, `test`); all planned categories are present, and categories.md records the target adjustments.

## anti - Anti-patterns (11)

- [anti-assert-for-contracts](anti-assert-for-contracts.md) - use preconditions for conditions that must hold in production
- [anti-class-delegate-protocol](anti-class-delegate-protocol.md) - make delegate protocols class-bound so delegates can be weak
- [anti-force-cast](anti-force-cast.md) - do not force casts with as
- [anti-identical-operands](anti-identical-operands.md) - do not compare an expression with itself
- [anti-implicitly-unwrapped](anti-implicitly-unwrapped.md) - avoid implicitly unwrapped optionals outside outlets
- [anti-legacy-constructor](anti-legacy-constructor.md) - use Swift initializers instead of legacy convenience functions
- [anti-nested-ternary](anti-nested-ternary.md) - do not nest the ternary conditional operator
- [anti-nonisolated-unsafe](anti-nonisolated-unsafe.md) - do not mark shared mutable state nonisolated(unsafe)
- [anti-optional-boolean](anti-optional-boolean.md) - do not use Optional for a two-state boolean
- [anti-optional-collection](anti-optional-collection.md) - do not use Optional for a collection whose empty state suffices
- [anti-superfluous-else](anti-superfluous-else.md) - drop else when the if branch exits the scope

## api - API design (16)

- [api-argument-labels](api-argument-labels.md) - give arguments the label that makes the call read as a grammatical phrase
- [api-boolean-assertions](api-boolean-assertions.md) - name Boolean members as assertions about the receiver
- [api-case-conventions](api-case-conventions.md) - follow Swift case conventions for types, members, and acronyms
- [api-complexity-doc](api-complexity-doc.md) - document the complexity of a computed property that is not O(1)
- [api-conversion-init-labels](api-conversion-init-labels.md) - label narrowing conversions and omit the label for value-preserving ones
- [api-default-parameters](api-default-parameters.md) - use one method with defaulted parameters instead of a method family
- [api-defaults-at-end](api-defaults-at-end.md) - place parameters with defaults at the end of the parameter list
- [api-deprecation](api-deprecation.md) - deprecate replaced declarations with an available attribute and a message
- [api-factory-make](api-factory-make.md) - begin factory method names with make
- [api-first-argument-label](api-first-argument-label.md) - keep the first initializer argument out of the type name's phrase
- [api-omit-needless-words](api-omit-needless-words.md) - omit words in a name that merely repeat type information
- [api-overload-return-type](api-overload-return-type.md) - do not overload a method only by return type
- [api-prefer-methods](api-prefer-methods.md) - prefer methods and properties to free functions
- [api-side-effect-naming](api-side-effect-naming.md) - name mutating operations with imperative verbs and their nonmutating twins with participles
- [api-tuple-closure-labels](api-tuple-closure-labels.md) - label tuple members and name closure parameters that appear in an API
- [api-weak-type-prefix](api-weak-type-prefix.md) - add a role noun in front of weakly typed parameters

## arc - ARC and ownership (12)

- [arc-borrowing-consuming](arc-borrowing-consuming.md) - mark methods that mutate and return their receiver as consuming
- [arc-capture-values](arc-capture-values.md) - capture a value in a capture list when the closure needs a snapshot
- [arc-closure-capture](arc-closure-capture.md) - use a weak capture to break the cycle between an object and its stored closure
- [arc-consume-operator](arc-consume-operator.md) - forward ownership at the last use with the consume operator
- [arc-deinit-release](arc-deinit-release.md) - release resources owned by a class in its deinitializer
- [arc-exclusive-access](arc-exclusive-access.md) - never pass the same class property to two inout parameters
- [arc-noncopyable](arc-noncopyable.md) - model unique resources as noncopyable structs instead of classes
- [arc-task-capture](arc-task-capture.md) - capture self weakly in a task that outlives the current call
- [arc-unmanaged](arc-unmanaged.md) - balance Unmanaged references with takeUnretainedValue against passUnretained
- [arc-unowned-lifetime](arc-unowned-lifetime.md) - use unowned only when the referenced instance is guaranteed to outlive the reference
- [arc-weak-consumption](arc-weak-consumption.md) - treat a weak reference as optional because it zeroes out on deallocation
- [arc-weak-cycle](arc-weak-cycle.md) - break strong reference cycles between class instances with a weak reference

## async - Async APIs and await ergonomics (12)

- [async-api-not-completion](async-api-not-completion.md) - expose new asynchronous operations as async functions
- [async-continuation-wrapper](async-continuation-wrapper.md) - wrap single-result callback APIs with a checked continuation
- [async-no-blocking](async-no-blocking.md) - do not block an async context waiting for scheduled work
- [async-overload-sync](async-overload-sync.md) - add the async form under the same name as the synchronous API
- [async-protocol-async](async-protocol-async.md) - declare asynchronous protocol requirements as async
- [async-sequence-over-callbacks](async-sequence-over-callbacks.md) - model repeated asynchronous values as an AsyncSequence
- [async-stream-adapter](async-stream-adapter.md) - bridge multi-value callbacks with AsyncStream
- [async-stream-buffering](async-stream-buffering.md) - bound the buffer of an AsyncStream that can outpace its consumer
- [async-stream-termination](async-stream-termination.md) - clean up the producer in the stream's onTermination handler
- [async-structured-not-task](async-structured-not-task.md) - await dependent work instead of launching an unstructured task
- [async-task-handle](async-task-handle.md) - keep the handle of an unstructured task that must be cancellable
- [async-task-sleep](async-task-sleep.md) - suspend with Task.sleep instead of sleeping the thread

## conc - Concurrency (13)

- [conc-actor-reentrancy](conc-actor-reentrancy.md) - re-check actor invariants after every await because actor methods are reentrant
- [conc-actor-state](conc-actor-state.md) - protect shared mutable state with an actor instead of unchecked sendability
- [conc-async-let](conc-async-let.md) - start independent operations with `async let` instead of awaiting them in sequence
- [conc-concurrent-offload](conc-concurrent-offload.md) - mark CPU-bound async work `@concurrent` so it leaves the caller's actor
- [conc-continuation-once](conc-continuation-once.md) - resume every checked continuation exactly once on every execution path
- [conc-detached-task](conc-detached-task.md) - prefer `Task` over `Task.detached` so launched work inherits actor isolation and context
- [conc-global-actor](conc-global-actor.md) - isolate a whole subsystem with a custom global actor instead of threading one actor instance
- [conc-mainactor-isolate](conc-mainactor-isolate.md) - isolate UI-owning types to the main actor instead of leaving their state nonisolated
- [conc-mutex-short-state](conc-mutex-short-state.md) - use `Mutex` for short synchronous critical sections instead of routing them through an actor
- [conc-sendable-values](conc-sendable-values.md) - make cross-isolation data sendable with immutable value types
- [conc-task-local](conc-task-local.md) - carry request metadata in task-local values instead of threading it through every signature
- [conc-task-priority](conc-task-priority.md) - let tasks inherit priority instead of overriding it at creation
- [conc-taskgroup-fanout](conc-taskgroup-fanout.md) - use structured task groups for dynamic fan-out instead of detached tasks

## const - Constants and configuration (6)

- [const-case-iterable](const-case-iterable.md) - use CaseIterable instead of hand-listing cases
- [const-enum-raw](const-enum-raw.md) - represent a fixed set of named values as an enum
- [const-legacy-constant](const-legacy-constant.md) - reference constants through their type
- [const-namespace-enum](const-namespace-enum.md) - host static members on a caseless enum
- [const-option-set](const-option-set.md) - model combinable flags as an OptionSet
- [const-static-let](const-static-let.md) - declare shared values as immutable static let

## conv - Compatibility and migration (6)

- [conv-availability-annotation](conv-availability-annotation.md) - declare OS version requirements with available
- [conv-available-runtime](conv-available-runtime.md) - check OS availability with an availability condition
- [conv-obsoleted](conv-obsoleted.md) - obsolete APIs that must no longer be called
- [conv-preconcurrency-declaration](conv-preconcurrency-declaration.md) - annotate declarations with preconcurrency while clients migrate
- [conv-preconcurrency-import](conv-preconcurrency-import.md) - stage concurrency checking with preconcurrency imports
- [conv-renamed](conv-renamed.md) - mark renamed APIs with an available attribute

## data - Data, Codable, persistence (12)

- [data-application-support](data-application-support.md) - store app-managed support files in Application Support
- [data-atomic-write](data-atomic-write.md) - write files atomically
- [data-caches](data-caches.md) - store regenerable files in Caches
- [data-codable](data-codable.md) - model serialized data with Codable types
- [data-coding-keys](data-coding-keys.md) - omit CodingKeys when property names already match the format
- [data-date-strategy](data-date-strategy.md) - decode dates with a strategy that matches the wire format
- [data-directory-api](data-directory-api.md) - resolve directories through the file manager APIs
- [data-encode-direction](data-encode-direction.md) - declare only the coding direction the type needs
- [data-key-strategy](data-key-strategy.md) - map a pervasive foreign key style with the decoder strategy
- [data-manual-coding](data-manual-coding.md) - write coding logic by hand only when synthesis cannot express the format
- [data-property-list](data-property-list.md) - encode property lists with PropertyListEncoder
- [data-sorted-keys](data-sorted-keys.md) - sort JSON keys when the output is compared or stored

## doc - Documentation (12)

- [doc-callouts](doc-callouts.md) - mark warnings and notes with recognized callout bullets
- [doc-every-declaration](doc-every-declaration.md) - write a documentation comment for every declaration
- [doc-local-comment](doc-local-comment.md) - use regular comments inside function bodies
- [doc-markup](doc-markup.md) - format longer documentation with recognized markup elements
- [doc-orphaned](doc-orphaned.md) - keep doc comments attached to their declaration
- [doc-parameter-section](doc-parameter-section.md) - document every parameter with a Parameter bullet
- [doc-returns-section](doc-returns-section.md) - document non-obvious return values with a Returns bullet
- [doc-see-also-bullet](doc-see-also-bullet.md) - cross-reference related symbols with a SeeAlso bullet
- [doc-summary-fragment](doc-summary-fragment.md) - write the summary as a single sentence fragment
- [doc-summary-separation](doc-summary-separation.md) - separate the summary from the discussion with a blank comment line
- [doc-summary-verb](doc-summary-verb.md) - open the summary with the verb that matches the declaration kind
- [doc-throws-section](doc-throws-section.md) - document thrown errors with a Throws bullet

## err - Error handling (16)

- [err-cancellation-check](err-cancellation-check.md) - check for cancellation at loop and suspension boundaries
- [err-cancellation-handler](err-cancellation-handler.md) - run immediate cancellation cleanup in `withTaskCancellationHandler`
- [err-cancellation-not-failure](err-cancellation-not-failure.md) - treat `CancellationError` as control flow, never as an application failure
- [err-catch-rethrow-rest](err-catch-rethrow-rest.md) - catch only the failures you can resolve and let the rest propagate
- [err-defer-cleanup](err-defer-cleanup.md) - register cleanup with `defer` immediately after acquiring a resource
- [err-error-enum-model](err-error-enum-model.md) - model each failure domain as an `Error` enum with associated values
- [err-localized-user-message](err-localized-user-message.md) - conform user-facing errors to `LocalizedError` with an `errorDescription`
- [err-log-unified](err-log-unified.md) - record handled failures with `os.Logger` using a subsystem, category, and level
- [err-no-fatal-recoverable](err-no-fatal-recoverable.md) - propagate recoverable failures instead of calling `fatalError` or `preconditionFailure`
- [err-no-force-try](err-no-force-try.md) - never force-try a fallible call in shipping code
- [err-ns-catch-typed](err-ns-catch-typed.md) - catch bridged Cocoa failures as `CocoaError` cases, not `NSError` domain and code
- [err-optional-not-failure](err-optional-not-failure.md) - distinguish expected absence from failure instead of collapsing both into an Optional
- [err-result-deferred](err-result-deferred.md) - prefer `throws` for immediate propagation and reserve `Result` for stored outcomes
- [err-try-optional-discard](err-try-optional-discard.md) - reserve `try?` for cases where every failure means the same absence
- [err-typed-throws](err-typed-throws.md) - use typed throws when the failure set is closed and callers handle it exhaustively
- [err-wrap-context](err-wrap-context.md) - wrap a propagated error with the operation context and keep the underlying cause

## ffi - C, Objective-C, and platform interop (8)

- [ffi-convention-block](ffi-convention-block.md) - declare Objective-C blocks with the block calling convention
- [ffi-convention-c](ffi-convention-c.md) - declare C callbacks with the C calling convention
- [ffi-cstring](ffi-cstring.md) - decode C strings with String(cString:)
- [ffi-nonobjc](ffi-nonobjc.md) - suppress Objective-C exposure that is not wanted
- [ffi-nssecurecoding](ffi-nssecurecoding.md) - adopt NSSecureCoding for archives
- [ffi-objc-members](ffi-objc-members.md) - expose only the members Objective-C needs
- [ffi-objc-name](ffi-objc-name.md) - prefix the Objective-C name you expose
- [ffi-opaque-pointer](ffi-opaque-pointer.md) - keep opaque C handles as OpaquePointer

## io - File and I/O (8)

- [io-coordinated-access](io-coordinated-access.md) - coordinate file access with NSFileCoordinator
- [io-copy-item](io-copy-item.md) - copy files with FileManager instead of read and write
- [io-create-directory](io-create-directory.md) - create intermediate directories when preparing a location
- [io-exclude-backup](io-exclude-backup.md) - exclude recreatable files from backup
- [io-file-size](io-file-size.md) - read a file's size from its resource values
- [io-filehandle-chunks](io-filehandle-chunks.md) - stream large files in chunks with FileHandle
- [io-mapped-read](io-mapped-read.md) - memory-map large read-only files
- [io-temp-directory](io-temp-directory.md) - write short-lived files to the temporary directory

## lint - Linting and formatting (12)

- [lint-analyze](lint-analyze.md) - run analyzer rules with swiftlint analyze
- [lint-baseline](lint-baseline.md) - adopt linting incrementally with a baseline
- [lint-custom-rules](lint-custom-rules.md) - encode project conventions as custom rules
- [lint-disable-reason](lint-disable-reason.md) - document a rule suppression with its reason
- [lint-disable-scope](lint-disable-scope.md) - scope a rule suppression to the line or region it covers
- [lint-nested-config](lint-nested-config.md) - scope rule overrides with nested configurations
- [lint-plugin-pin](lint-plugin-pin.md) - pin the lint toolchain version
- [lint-superfluous-disable](lint-superfluous-disable.md) - remove suppressions that no longer cover a violation
- [lint-swift-format-adopt](lint-swift-format-adopt.md) - format with swift-format and a committed configuration
- [lint-swift-format-lint-ci](lint-swift-format-lint-ci.md) - check formatting in CI instead of rewriting files
- [lint-swiftlint-adopt](lint-swiftlint-adopt.md) - adopt SwiftLint with a committed configuration
- [lint-swiftlint-strict](lint-swiftlint-strict.md) - fail the lint step on warnings

## macro - Macros (6)

- [macro-call-site-function](macro-call-site-function.md) - report the enclosing function with #function
- [macro-declaration-public](macro-declaration-public.md) - declare macros public
- [macro-extension-conformances](macro-extension-conformances.md) - state the conformances an extension macro adds
- [macro-names-list](macro-names-list.md) - declare the names a macro generates
- [macro-naming](macro-naming.md) - name freestanding macros in lower camel case
- [macro-role-match](macro-role-match.md) - match the macro role to the code it generates

## mem - Memory and value lifetimes (12)

- [mem-buffer-borrowing](mem-buffer-borrowing.md) - lend collection storage to C with withUnsafeBufferPointer instead of allocating a copy
- [mem-contiguous-array](mem-contiguous-array.md) - use ContiguousArray for class-element arrays that never bridge to Objective-C
- [mem-lazy-property](mem-lazy-property.md) - defer expensive property initialization with lazy
- [mem-managed-buffer](mem-managed-buffer.md) - destroy live elements in the ManagedBuffer subclass's deinit
- [mem-nscache](mem-nscache.md) - use NSCache for caches that should be evicted under memory pressure
- [mem-pointer-pairing](mem-pointer-pairing.md) - pair pointer allocation with initialization, deinitialization, and deallocation
- [mem-pointer-scope](mem-pointer-scope.md) - keep pointers from implicit bridging inside the call that created them
- [mem-reserve-growth](mem-reserve-growth.md) - do not call reserveCapacity inside a growth loop
- [mem-reserve-known](mem-reserve-known.md) - reserve array capacity once when the final count is known
- [mem-slice-storage](mem-slice-storage.md) - convert an ArraySlice to Array before storing it long-term
- [mem-substring-storage](mem-substring-storage.md) - convert a Substring to String before storing it long-term
- [mem-unsafe-bitcast](mem-unsafe-bitcast.md) - avoid unsafeBitCast for class and pointer conversions

## net - Networking (8)

- [net-async-data](net-async-data.md) - load network data with the async URLSession methods
- [net-background-session](net-background-session.md) - use a background session for transfers that must finish
- [net-connectivity-wait](net-connectivity-wait.md) - let sessions wait for connectivity
- [net-session-invalidate](net-session-invalidate.md) - invalidate a session you created when it is done
- [net-stream-bytes](net-stream-bytes.md) - process a response while it downloads
- [net-task-metrics](net-task-metrics.md) - read the metrics URLSession collects for a task
- [net-timeout](net-timeout.md) - set the request timeout deliberately
- [net-upload-file](net-upload-file.md) - upload large bodies from a file

## num - Numerics (6)

- [num-decimal-money](num-decimal-money.md) - use Decimal for values that are inherently base-10
- [num-divisibility](num-divisibility.md) - test divisibility with isMultiple(of:)
- [num-literal-readability](num-literal-readability.md) - group digits in long numeric literals
- [num-nan-check](num-nan-check.md) - test for NaN with isNaN instead of equality
- [num-overflow-optin](num-overflow-optin.md) - use overflow operators only when wraparound is intended
- [num-random-range](num-random-range.md) - draw random values from a range instead of modulo arithmetic

## obs - Observability (12)

- [obs-log-levels](obs-log-levels.md) - choose the log level that matches the message's severity
- [obs-log-privacy](obs-log-privacy.md) - keep default log redaction for user data and publish only what is safe
- [obs-metrickit-adopt](obs-metrickit-adopt.md) - collect field performance data with MetricKit instead of local instrumentation only
- [obs-metrickit-diagnostics](obs-metrickit-diagnostics.md) - handle MetricKit diagnostic payloads for hangs and crashes
- [obs-metrickit-launch](obs-metrickit-launch.md) - watch launch and responsiveness metrics from field payloads
- [obs-metrickit-memory](obs-metrickit-memory.md) - track peak memory from field metric payloads alongside CPU
- [obs-signpost-animations](obs-signpost-animations.md) - measure animation work with `beginAnimationInterval`
- [obs-signpost-events](obs-signpost-events.md) - mark points of interest with signpost events
- [obs-signpost-intervals](obs-signpost-intervals.md) - measure task durations with `OSSignposter` intervals
- [obs-signpost-logger-link](obs-signpost-logger-link.md) - derive the signposter from the logger so they share a subsystem and category
- [obs-signpost-release](obs-signpost-release.md) - control signpost emission at runtime instead of compiling it out
- [obs-swiftui-updates](obs-swiftui-updates.md) - keep SwiftUI view body updates short by computing outside the body

## pat - Pattern matching and control flow (4)

- [pat-fallthrough](pat-fallthrough.md) - do not use fallthrough to share a case body
- [pat-if-case](pat-if-case.md) - match a single pattern with if case
- [pat-labeled-loop](pat-labeled-loop.md) - label nested loops instead of tracking a flag
- [pat-one-sided-range](pat-one-sided-range.md) - use one-sided ranges for open-ended slices

## perf - Performance (12)

- [perf-contains-over-filter](perf-contains-over-filter.md) - test for a matching element with contains instead of filtering
- [perf-dictionary-lookup](perf-dictionary-lookup.md) - look up keyed values in a Dictionary instead of scanning
- [perf-empty-check](perf-empty-check.md) - test emptiness with isEmpty
- [perf-first-where](perf-first-where.md) - find the first matching element with first(where:)
- [perf-flatmap-map-reduce](perf-flatmap-map-reduce.md) - flatten nested collections with flatMap
- [perf-last-where](perf-last-where.md) - find the last matching element with last(where:)
- [perf-lazy-chain](perf-lazy-chain.md) - mark transformation chains lazy to avoid intermediate arrays
- [perf-reduce-into](perf-reduce-into.md) - accumulate into a copy-on-write result with reduce(into:)
- [perf-remove-first](perf-remove-first.md) - do not drain an array from the front in a loop
- [perf-set-membership](perf-set-membership.md) - use a Set for repeated membership tests
- [perf-sorted-first-last](perf-sorted-first-last.md) - compute the minimum or maximum with min or max instead of sorting
- [perf-string-index](perf-string-index.md) - iterate a string instead of reaching characters through integer offsets

## proj - Project and packaging (13)

- [proj-canimport](proj-canimport.md) - guard platform-specific modules with canImport
- [proj-debug-flags](proj-debug-flags.md) - gate debug-only code with a compilation condition, not a runtime constant
- [proj-exported-import](proj-exported-import.md) - do not re-export dependencies with the exported import attribute
- [proj-file-scoped-import](proj-file-scoped-import.md) - scope a dependency to the file that uses it with a private import
- [proj-frozen](proj-frozen.md) - apply frozen only when a public type's layout must stay stable
- [proj-import-access](proj-import-access.md) - mark implementation-only dependencies with an internal import
- [proj-inlinable](proj-inlinable.md) - mark a public function inlinable only when its body is small and stable
- [proj-package-access](proj-package-access.md) - use package access for APIs shared across a package's modules
- [proj-platform-conditional](proj-platform-conditional.md) - branch on the target platform with os(), not runtime string checks
- [proj-public-import](proj-public-import.md) - declare public imports explicitly for dependencies exposed in the API
- [proj-scoped-import](proj-scoped-import.md) - import only the symbols a file uses from a broad module
- [proj-unavailable](proj-unavailable.md) - mark an API unavailable when calling it is always wrong
- [proj-usable-from-inline](proj-usable-from-inline.md) - mark internal symbols referenced by inlinable code usableFromInline

## sec - Security (12)

- [sec-ats-trust](sec-ats-trust.md) - keep App Transport Security's server trust evaluation in place
- [sec-biometric-gate](sec-biometric-gate.md) - gate sensitive operations behind LocalAuthentication
- [sec-crypto-aead](sec-crypto-aead.md) - encrypt with CryptoKit's authenticated ciphers instead of hand-rolled transforms
- [sec-crypto-hash](sec-crypto-hash.md) - use CryptoKit's secure digests for integrity checks
- [sec-cryptokit-key-storage](sec-cryptokit-key-storage.md) - persist CryptoKit keys as keychain items instead of defaults or constants
- [sec-ephemeral-session](sec-ephemeral-session.md) - use an ephemeral session configuration for sensitive requests
- [sec-file-protection](sec-file-protection.md) - write sensitive files with complete data protection
- [sec-keychain-accessibility](sec-keychain-accessibility.md) - set the most restrictive keychain accessibility that the item can tolerate
- [sec-keychain-secrets](sec-keychain-secrets.md) - store credentials in the keychain instead of user defaults or files
- [sec-random-unpredictable](sec-random-unpredictable.md) - draw security tokens from the system random generator
- [sec-secure-enclave](sec-secure-enclave.md) - keep device-bound private keys in the Secure Enclave
- [sec-urlcomponents](sec-urlcomponents.md) - build URLs from components so untrusted input is encoded

## style - Style and conventions (12)

- [style-for-case](style-for-case.md) - combine loop filtering and binding with for case
- [style-guard-early-exit](style-guard-early-exit.md) - use guard for requirements that must hold before the main work
- [style-half-open-range](style-half-open-range.md) - use half-open ranges for zero-based indexes
- [style-if-switch-expression](style-if-switch-expression.md) - return values directly from if and switch expressions
- [style-implicit-return](style-implicit-return.md) - omit return from a single-expression closure
- [style-nil-coalescing](style-nil-coalescing.md) - use the nil-coalescing operator for a default value
- [style-optional-chaining](style-optional-chaining.md) - reach through optional values with optional chaining
- [style-optional-shorthand](style-optional-shorthand.md) - use the if let shorthand when shadowing the same optional
- [style-string-interpolation](style-string-interpolation.md) - build strings with interpolation instead of concatenation
- [style-switch-no-default](style-switch-no-default.md) - omit default in switches over enumerations
- [style-switch-where](style-switch-where.md) - filter switch cases with a where clause
- [style-trailing-closure](style-trailing-closure.md) - write a multi-line final closure as a trailing closure

## test - Testing (6)

- [test-define-with-attribute](test-define-with-attribute.md) - declare test functions with the Test attribute
- [test-expect](test-expect.md) - assert with #expect
- [test-require](test-require.md) - unwrap optionals with #require
- [test-serialized](test-serialized.md) - serialize suites that share state
- [test-setup-teardown](test-setup-teardown.md) - replace setUp and tearDown with init and deinit
- [test-suite-types](test-suite-types.md) - group tests in suite types

## type - Types and modeling (15)

- [type-access-control](type-access-control.md) - expose the narrowest access level that satisfies callers
- [type-any-existential](type-any-existential.md) - spell existential types with `any` so type erasure is explicit
- [type-enum-associated](type-enum-associated.md) - attach per-case data with associated values instead of parallel optionals
- [type-enum-state](type-enum-state.md) - model mutually exclusive states as enum cases instead of independent flags
- [type-final-class](type-final-class.md) - mark classes final unless subclassing is part of the design
- [type-generic-constraints](type-generic-constraints.md) - write one generic function instead of an overload per concrete type
- [type-inout-mutation](type-inout-mutation.md) - use `inout` only to mutate caller state, not to smuggle out a result
- [type-let-over-var](type-let-over-var.md) - declare values that never change with `let`
- [type-nested-namespacing](type-nested-namespacing.md) - nest supporting types instead of prefixing their names
- [type-opaque-return](type-opaque-return.md) - return an opaque `some` type to keep concrete implementation types out of the API
- [type-optional-absence](type-optional-absence.md) - represent absence with an Optional, not a sentinel value
- [type-protocol-capability](type-protocol-capability.md) - name capability protocols with able, ible, or ing suffixes
- [type-struct-default](type-struct-default.md) - model data with structs and reserve classes for identity, inheritance, or shared lifetime
- [type-synthesized-conformance](type-synthesized-conformance.md) - let the compiler synthesize Equatable conformance instead of hand-writing equality
- [type-value-copy](type-value-copy.md) - do not rely on a value-type copy to isolate mutable reference state

## ui - SwiftUI and interface (17)

- [ui-accessibility-label](ui-accessibility-label.md) - label controls that show only an icon
- [ui-animation-value](ui-animation-value.md) - scope animations to the value that changes
- [ui-appstorage](ui-appstorage.md) - persist simple preferences with AppStorage
- [ui-binding-child](ui-binding-child.md) - pass a Binding when a subview must change the value
- [ui-decorative-image](ui-decorative-image.md) - hide decorative images from accessibility
- [ui-environment](ui-environment.md) - read hierarchy values through the environment
- [ui-foreach-constant-count](ui-foreach-constant-count.md) - give each list element a constant number of views
- [ui-lazy-stack](ui-lazy-stack.md) - use lazy stacks for long scrollable content
- [ui-list-id](ui-list-id.md) - let list elements conform to Identifiable
- [ui-navigationstack](ui-navigationstack.md) - build navigation hierarchies with NavigationStack
- [ui-observable](ui-observable.md) - track model changes with the Observable macro
- [ui-semantic-color](ui-semantic-color.md) - prefer semantic colors over fixed components
- [ui-semantic-font](ui-semantic-font.md) - use text styles instead of fixed point sizes
- [ui-state-ownership](ui-state-ownership.md) - keep view-local mutable values in State
- [ui-task-modifier](ui-task-modifier.md) - run view lifecycle work in the task modifier
- [ui-transition](ui-transition.md) - attach transitions to the view that appears
- [ui-with-animation](ui-with-animation.md) - animate state changes with withAnimation
