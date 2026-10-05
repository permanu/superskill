# C++ Rules Index

Baseline: latest
Rules: 326 (verified: 326)

## anti - Anti-patterns (7)

- [anti-c-style-cast](anti-c-style-cast.md) - use named casts, never C-style casts
- [anti-complicated-expression](anti-complicated-expression.md) - split complicated expressions into named steps
- [anti-fallthrough](anti-fallthrough.md) - state intentional switch fallthrough with the attribute
- [anti-magic-constants](anti-magic-constants.md) - replace magic constants with named ones
- [anti-shadowing](anti-shadowing.md) - do not reuse names in nested scopes
- [anti-slice](anti-slice.md) - do not pass polymorphic objects by value
- [anti-using-directive](anti-using-directive.md) - keep using-directives out of file scope

## api - Interfaces and API design (13)

- [api-abstract-interface](api-abstract-interface.md) - empty abstract interfaces; state lives in implementations
- [api-adjacent-params](api-adjacent-params.md) - distinct types for adjacent same-type parameters
- [api-avoid-globals](api-avoid-globals.md) - no mutable global state; pass dependencies as parameters
- [api-avoid-singletons](api-avoid-singletons.md) - pass services instead of reaching for a singleton
- [api-c-abi-subset](api-c-abi-subset.md) - C-style subset across cross-compiler ABI boundaries
- [api-default-args](api-default-args.md) - default arguments over trailing overload sets
- [api-few-arguments](api-few-arguments.md) - group related arguments into structs
- [api-nodiscard](api-nodiscard.md) - [[nodiscard]] on results that must be used
- [api-param-passing](api-param-passing.md) - by value for cheap types, views or const& for the rest
- [api-pimpl](api-pimpl.md) - pimpl for stable ABI and compile firewalls
- [api-preconditions](api-preconditions.md) - state and assert preconditions
- [api-return-struct](api-return-struct.md) - return aggregates instead of output parameters
- [api-virtual-dtor](api-virtual-dtor.md) - public virtual or protected non-virtual base destructors

## async - Async and coroutines (9)

- [async-await-ready](async-await-ready.md) - answer await_ready when the result is already there
- [async-coroutine-lifetime](async-coroutine-lifetime.md) - pass data to coroutines by value
- [async-coroutine-own](async-coroutine-own.md) - give every suspended coroutine an owner
- [async-future-dtor](async-future-dtor.md) - keep the future returned by std::async
- [async-launch-policy](async-launch-policy.md) - state the launch policy explicitly
- [async-promise-broken](async-promise-broken.md) - fulfill or fail every promise
- [async-promise-exception](async-promise-exception.md) - let exceptions travel through the future
- [async-return-via-future](async-return-via-future.md) - return results through the future
- [async-shared-future](async-shared-future.md) - share a result with shared_future

## coll - Containers and algorithms (12)

- [coll-array-over-carray](coll-array-over-carray.md) - std::array instead of a C array
- [coll-erase-remove](coll-erase-remove.md) - erase-remove idiom over per-element erase
- [coll-find](coll-find.md) - std::find instead of hand-rolled search loops
- [coll-invalidation](coll-invalidation.md) - no iterators held across container modifications
- [coll-lower-bound](coll-lower-bound.md) - binary search on sorted ranges
- [coll-map-find](coll-map-find.md) - find/contains, not operator[] which inserts
- [coll-no-memset-nontrivial](coll-no-memset-nontrivial.md) - no memset/memcpy on non-trivial types
- [coll-range-for](coll-range-for.md) - range-for over index bookkeeping
- [coll-sort-strict-weak](coll-sort-strict-weak.md) - strict comparator for sort
- [coll-transform](coll-transform.md) - std::transform for element mapping
- [coll-vector-bool](coll-vector-bool.md) - do not treat vector<bool> as ordinary
- [coll-vector-default](coll-vector-default.md) - vector by default; other containers for their guarantees

## conc - Concurrency and atomics (13)

- [conc-atomic-not-volatile](conc-atomic-not-volatile.md) - atomics for synchronization, never volatile
- [conc-default-memory-order](conc-default-memory-order.md) - default seq_cst; weaken only with proof
- [conc-jthread-over-thread](conc-jthread-over-thread.md) - jthread joins automatically on scope exit
- [conc-lockfree-last-resort](conc-lockfree-last-resort.md) - no hand-rolled lock-free code; use standard RMWs
- [conc-mutex-with-data](conc-mutex-with-data.md) - define the mutex with the data it guards
- [conc-name-locks](conc-name-locks.md) - name every lock guard
- [conc-no-callback-under-lock](conc-no-callback-under-lock.md) - never call unknown code under a lock
- [conc-no-detach](conc-no-detach.md) - never detach threads
- [conc-pass-by-value](conc-pass-by-value.md) - pass data into threads by value
- [conc-scoped-lock-multiple](conc-scoped-lock-multiple.md) - scoped_lock for multiple mutexes
- [conc-stop-token](conc-stop-token.md) - cooperative cancellation with stop_token
- [conc-tasks-not-threads](conc-tasks-not-threads.md) - tasks via async and futures, not raw threads
- [conc-wait-predicate](conc-wait-predicate.md) - condition variable waits always use a predicate

## const - const-correctness and constant evaluation (12)

- [const-as-const](const-as-const.md) - std::as_const for read-only views
- [const-cbegin](const-cbegin.md) - cbegin/cend for read-only traversal
- [const-constexpr-members](const-constexpr-members.md) - constexpr constructors and accessors
- [const-constinit](const-constinit.md) - constinit for globals before dynamic initialization
- [const-consteval](const-consteval.md) - consteval when a call must be compile time
- [const-immutable-by-default](const-immutable-by-default.md) - objects immutable by default
- [const-member-functions](const-member-functions.md) - const member functions by default
- [const-mutable](const-mutable.md) - mutable only for state that is not observable
- [const-no-cast-away](const-no-cast-away.md) - never cast away const to write
- [const-no-cast-this](const-no-cast-this.md) - never cast this inside a const member
- [const-ref-lifetime](const-ref-lifetime.md) - never return a reference bound to a temporary
- [const-ref-params](const-ref-params.md) - pointers and references to const by default

## data - Data modeling and invariants (4)

- [data-const-members](data-const-members.md) - avoid const data members in assignable types
- [data-delete-operations](data-delete-operations.md) - delete unwanted operations explicitly
- [data-self-assignment](data-self-assignment.md) - make copy assignment safe for self-assignment
- [data-two-phase](data-two-phase.md) - constructors produce complete objects

## doc - Documentation and comments (12)

- [doc-brief](doc-brief.md) - one-line brief description at the top of the block
- [doc-comment-out](doc-comment-out.md) - #if 0 or line comments to disable code, never block comments
- [doc-crisp](doc-crisp.md) - short comments over paragraphs
- [doc-deprecated](doc-deprecated.md) - [[deprecated]] with a replacement message
- [doc-file](doc-file.md) - file-level @file block for global declarations
- [doc-group](doc-group.md) - @defgroup and group markers for related declarations
- [doc-no-restate](doc-no-restate.md) - no comments that repeat the code
- [doc-params](doc-params.md) - @param and @return for every parameter and result
- [doc-public-api](doc-public-api.md) - a doc block on every public declaration
- [doc-structural](doc-structural.md) - doc block in front of the declaration, not behind a structural command
- [doc-throws](doc-throws.md) - document the exceptions a function may propagate
- [doc-why](doc-why.md) - comments state intent, not mechanics

## err - Error handling (16)

- [err-catch-by-reference](err-catch-by-reference.md) - catch exceptions by const reference to avoid slicing
- [err-catch-order](err-catch-order.md) - order catch clauses most derived first
- [err-ctor-failure](err-ctor-failure.md) - failing constructors throw, or a factory returns expected
- [err-degradation-path](err-degradation-path.md) - without exceptions, check results and fail fast
- [err-dtor-noexcept](err-dtor-noexcept.md) - destructors, moves, and swap never throw; expose close()
- [err-error-code-check](err-error-code-check.md) - check the error code before consuming guarded outputs
- [err-error-code-systematic](err-error-code-systematic.md) - carry std::error_code through expected, not magic ints
- [err-expected-for-recoverable](err-expected-for-recoverable.md) - return std::expected for recoverable failures
- [err-expected-monadic](err-expected-monadic.md) - compose fallible steps with and_then and transform
- [err-no-catch-all-swallow](err-no-catch-all-swallow.md) - catch(...) rethrows, translates, or reports
- [err-no-throw-across-c](err-no-throw-across-c.md) - catch every exception at an extern "C" boundary
- [err-noexcept-truthful](err-noexcept-truthful.md) - noexcept only when no exception can escape
- [err-optional-only-for-absence](err-optional-only-for-absence.md) - optional for absence, expected when the reason matters
- [err-raii-not-catch](err-raii-not-catch.md) - RAII handles replace cleanup catch blocks
- [err-throw-by-value](err-throw-by-value.md) - throw exception objects by value, not pointers
- [err-translate-with-context](err-translate-with-context.md) - translate with throw_with_nested to keep the cause

## ffi - C interop and ABI (12)

- [ffi-cpp-calling-c](ffi-cpp-calling-c.md) - wrap C interfaces in RAII types on the C++ side
- [ffi-dual-use-header](ffi-dual-use-header.md) - __cplusplus guards around extern "C"
- [ffi-enum-underlying](ffi-enum-underlying.md) - fixed underlying types for exported enums
- [ffi-extern-c](ffi-extern-c.md) - extern "C" so names are not mangled
- [ffi-no-overloads](ffi-no-overloads.md) - one distinct C function per operation
- [ffi-opaque-handle](ffi-opaque-handle.md) - opaque pointers, not object layouts
- [ffi-pointer-and-size](ffi-pointer-and-size.md) - sequences as pointer and length
- [ffi-prefer-cpp](ffi-prefer-cpp.md) - prefer C++ facilities; C for code compiled as C
- [ffi-size-assert](ffi-size-assert.md) - pin shared struct layouts with static_assert
- [ffi-standard-layout](ffi-standard-layout.md) - boundary types are standard-layout
- [ffi-templates-not-c](ffi-templates-not-c.md) - free functions, not members or templates
- [ffi-trivial-copyable](ffi-trivial-copyable.md) - only trivially copyable types cross by value

## init - Initialization and construction (9)

- [init-brace-init](init-brace-init.md) - prefer the brace-initializer syntax
- [init-declare-at-use](init-declare-at-use.md) - declare a variable where its value exists
- [init-defaulted-ctor](init-defaulted-ctor.md) - use = default for the default semantics
- [init-delegating](init-delegating.md) - share constructor work through delegation
- [init-init-not-assign](init-init-not-assign.md) - initialize members instead of assigning in the constructor body
- [init-member-order](init-member-order.md) - write member initializers in declaration order
- [init-nsdmi](init-nsdmi.md) - give members default member initializers
- [init-static-local](init-static-local.md) - initialize on first use with a function-local static
- [init-virtual-call](init-virtual-call.md) - do not call virtual functions during construction

## io - I/O and filesystem (12)

- [io-atomic-replace](io-atomic-replace.md) - replace files by renaming a sibling temporary
- [io-binary-mode](io-binary-mode.md) - binary mode for data that is not text
- [io-check-state](io-check-state.md) - check stream state after I/O; failures set flags
- [io-error-code-overloads](io-error-code-overloads.md) - error_code overloads for expected filesystem failures
- [io-file-permissions](io-file-permissions.md) - restrictive modes for files that hold sensitive data
- [io-flush-check](io-flush-check.md) - observe flush and close failures on output files
- [io-istringstream-parse](io-istringstream-parse.md) - parse fields with istringstream, not position math
- [io-no-toctou](io-no-toctou.md) - attempt the operation instead of exists-then-use
- [io-path-type](io-path-type.md) - filesystem::path instead of string concatenation
- [io-raii-streams](io-raii-streams.md) - streams own the file; no manual open and close
- [io-read-whole-file](io-read-whole-file.md) - istreambuf_iterator for whole-file reads
- [io-sync-with-stdio](io-sync-with-stdio.md) - disable stdio synchronization when C I/O is unused

## lint - Build and lint tooling (6)

- [lint-clang-tidy](lint-clang-tidy.md) - run clang-tidy with the guideline checks
- [lint-diagnostic-pragmas](lint-diagnostic-pragmas.md) - suppress diagnostics in the smallest scope
- [lint-pedantic](lint-pedantic.md) - compile strict ISO mode in CI
- [lint-static-analyzer](lint-static-analyzer.md) - run a static analyzer on the build
- [lint-warnings-enabled](lint-warnings-enabled.md) - compile with the standard warning sets enabled
- [lint-werror](lint-werror.md) - treat warnings as errors in CI

## macro - Preprocessor and macros (12)

- [macro-all-caps](macro-all-caps.md) - ALL_CAPS names for macros
- [macro-assert-side-effects](macro-assert-side-effects.md) - no side effects inside assert
- [macro-constexpr](macro-constexpr.md) - constexpr instead of object-like macros
- [macro-has-include](macro-has-include.md) - __has_include for optional headers
- [macro-if-constexpr](macro-if-constexpr.md) - if constexpr for compile-time branches, #if for feature detection
- [macro-include-guard](macro-include-guard.md) - include guards on every header
- [macro-inline-function](macro-inline-function.md) - inline functions instead of function-like macros
- [macro-no-program-text](macro-no-program-text.md) - no macros that generate declarations
- [macro-no-side-effects](macro-no-side-effects.md) - no side-effecting macro arguments
- [macro-no-variadic-c](macro-no-variadic-c.md) - variadic templates instead of va_list
- [macro-undef-helper](macro-undef-helper.md) - #undef helper macros when their region ends
- [macro-unique-prefix](macro-unique-prefix.md) - unique, project-prefixed macro names

## mem - Memory management (12)

- [mem-aligned-new](mem-aligned-new.md) - new honors alignas; malloc does not
- [mem-buffer-vector-byte](mem-buffer-vector-byte.md) - vector<std::byte> for raw byte buffers
- [mem-delete-null-ok](mem-delete-null-ok.md) - delete null is a no-op; no null guard needed
- [mem-let-new-throw](mem-let-new-throw.md) - let new throw bad_alloc; no nothrow or null checks
- [mem-matched-alloc-free](mem-matched-alloc-free.md) - match new/delete, new[]/delete[], malloc/free
- [mem-monotonic-resource](mem-monotonic-resource.md) - monotonic buffer for many short-lived allocations
- [mem-no-delete-incomplete](mem-no-delete-incomplete.md) - never delete through an incomplete type
- [mem-no-malloc](mem-no-malloc.md) - avoid malloc and free
- [mem-no-smartptr-subscript](mem-no-smartptr-subscript.md) - no operator[] on smart pointers
- [mem-overwrite-buffers](mem-overwrite-buffers.md) - make_unique_for_overwrite for buffers you fill
- [mem-resource-outlives](mem-resource-outlives.md) - memory resources must outlive their containers
- [mem-scoped-over-heap](mem-scoped-over-heap.md) - prefer scoped objects over heap allocation

## num - Numerics and arithmetic (12)

- [num-avoid-overflow](num-avoid-overflow.md) - guard operands before overflow or underflow
- [num-constants](num-constants.md) - std::numbers constants instead of typed-in digits
- [num-divide-zero](num-divide-zero.md) - reject zero divisors before dividing
- [num-duration](num-duration.md) - carry time units in std::chrono::duration
- [num-fixed-width](num-fixed-width.md) - fixed-width types for stored and transmitted values
- [num-intcmp](num-intcmp.md) - std::cmp_less for comparisons across signedness
- [num-limits](num-limits.md) - std::numeric_limits over C macros
- [num-midpoint](num-midpoint.md) - overflow-safe average with std::midpoint
- [num-no-mixed-sign](num-no-mixed-sign.md) - no mixed signed and unsigned expressions
- [num-signed-arithmetic](num-signed-arithmetic.md) - signed types for arithmetic
- [num-to-chars](num-to-chars.md) - std::to_chars for number-to-text conversion
- [num-unsigned-bitops](num-unsigned-bitops.md) - unsigned types for bit manipulation

## obs - Observability and logging (12)

- [obs-atomic-lines](obs-atomic-lines.md) - serialize whole log lines under one mutex
- [obs-clog-vs-cerr](obs-clog-vs-cerr.md) - clog for routine logs, cerr for immediate errors
- [obs-error-code-message](obs-error-code-message.md) - report error_code::message(), not just the value
- [obs-exception-what](obs-exception-what.md) - include e.what() in failure reports
- [obs-format](obs-format.md) - std::format for compile-time-checked messages
- [obs-nested-cause](obs-nested-cause.md) - walk the nested exception chain when reporting
- [obs-no-secrets](obs-no-secrets.md) - never log secrets or sensitive data
- [obs-report-once](obs-report-once.md) - report a failure once, at the layer that handles it
- [obs-source-location](obs-source-location.md) - capture the call site with std::source_location
- [obs-system-clock](obs-system-clock.md) - system_clock for timestamps, steady_clock for durations
- [obs-terminate-handler](obs-terminate-handler.md) - terminate handler reports the in-flight exception
- [obs-thread-id](obs-thread-id.md) - include the thread id in concurrent log lines

## pat - Architecture patterns (6)

- [pat-compile-time](pat-compile-time.md) - prefer compile-time checking to run-time checking
- [pat-encapsulate](pat-encapsulate.md) - encapsulate messy constructs behind an interface
- [pat-final-sparingly](pat-final-sparingly.md) - use final on classes sparingly
- [pat-no-protected-data](pat-no-protected-data.md) - do not expose protected data
- [pat-no-trivial-accessors](pat-no-trivial-accessors.md) - do not wrap plain data in accessor pairs
- [pat-same-access](pat-same-access.md) - keep data members at one access level

## perf - Performance (12)

- [perf-compact-hot-data](perf-compact-hot-data.md) - keep hot structs compact; move cold fields out
- [perf-constexpr](perf-constexpr.md) - compute constants at compile time
- [perf-contiguous-access](perf-contiguous-access.md) - traverse memory linearly over contiguous storage
- [perf-hoist-loop-work](perf-hoist-loop-work.md) - hoist loop-invariant work out of loop conditions
- [perf-inline-small](perf-inline-small.md) - define small hot functions where they can inline
- [perf-measure-first](perf-measure-first.md) - measure before optimizing performance-critical code
- [perf-no-endl](perf-no-endl.md) - '\n' over std::endl unless a flush is required
- [perf-no-return-move](perf-no-return-move.md) - no return std::move(local); it blocks NRVO
- [perf-range-for-refs](perf-range-for-refs.md) - iterate by reference to avoid per-element copies
- [perf-reserve-capacity](perf-reserve-capacity.md) - reserve before filling known-size containers
- [perf-sink-move](perf-sink-move.md) - move will-move-from parameters into members
- [perf-static-dispatch](perf-static-dispatch.md) - static dispatch in hot paths for known type sets

## proj - Project structure and build (12)

- [proj-header-class-definition](proj-header-class-definition.md) - types used across files live in headers
- [proj-header-declares](proj-header-declares.md) - headers declare; source files define
- [proj-header-inline](proj-header-inline.md) - definitions that must live in a header are inline
- [proj-include-own-header](proj-include-own-header.md) - include the file's own header first
- [proj-include-what-you-use](proj-include-what-you-use.md) - include what you use, not transitive names
- [proj-inline-variables](proj-inline-variables.md) - share header constants with inline variables
- [proj-namespace-structure](proj-namespace-structure.md) - namespaces express logical structure
- [proj-no-unnamed-header](proj-no-unnamed-header.md) - no unnamed namespaces in headers
- [proj-no-using-in-header](proj-no-using-in-header.md) - no using namespace at global scope in headers
- [proj-odr-identical-tokens](proj-odr-identical-tokens.md) - shared types must be token-identical everywhere
- [proj-self-contained-header](proj-self-contained-header.md) - headers compile alone
- [proj-unnamed-namespace](proj-unnamed-namespace.md) - internal helpers in unnamed namespaces

## ptr - Smart pointers and pointer discipline (10)

- [ptr-addressof](ptr-addressof.md) - take addresses with std::addressof in generic code
- [ptr-aliasing-ctor](ptr-aliasing-ctor.md) - point at a subobject with the aliasing constructor
- [ptr-custom-deleter](ptr-custom-deleter.md) - match the deleter to how the resource was created
- [ptr-enable-shared-from-this](ptr-enable-shared-from-this.md) - one control block per object
- [ptr-get-observe](ptr-get-observe.md) - get() observes, never owns
- [ptr-nullptr](ptr-nullptr.md) - nullptr for null pointers
- [ptr-release-handoff](ptr-release-handoff.md) - pair release() with an immediate new owner
- [ptr-shared-aliased-dangling](ptr-shared-aliased-dangling.md) - keep the owner alive for aliases
- [ptr-use-count-debug](ptr-use-count-debug.md) - use_count is not logic
- [ptr-weak-lock](ptr-weak-lock.md) - promote weak_ptr with lock and test the result

## raii - RAII and resource management (13)

- [raii-lock-guard](raii-lock-guard.md) - lock mutexes with lock_guard/scoped_lock, never manual lock/unlock
- [raii-make-unique](raii-make-unique.md) - create smart pointers with make_unique/make_shared, not raw new
- [raii-move-valid-source](raii-move-valid-source.md) - moves leave the source valid and non-owning
- [raii-no-naked-new](raii-no-naked-new.md) - no explicit new/delete; owners come from make_unique/make_shared
- [raii-param-ownership](raii-param-ownership.md) - parameter types state the lifetime role
- [raii-raw-non-owning](raii-raw-non-owning.md) - raw pointers and references are non-owning
- [raii-return-by-value](raii-return-by-value.md) - return handles by value, not through out-parameters
- [raii-rule-of-five](raii-rule-of-five.md) - declare/default/delete all five special members together
- [raii-rule-of-zero](raii-rule-of-zero.md) - own through members; declare no special members
- [raii-scope-guard](raii-scope-guard.md) - scope guard for cleanup that is not a resource
- [raii-unique-default](raii-unique-default.md) - unique_ptr by default; shared_ptr only for shared lifetimes
- [raii-weak-break-cycles](raii-weak-break-cycles.md) - break shared_ptr cycles with weak_ptr
- [raii-wrap-resources](raii-wrap-resources.md) - wrap every resource in an RAII handle

## sec - Security (12)

- [sec-bounds-checked](sec-bounds-checked.md) - bounds-checked access for untrusted indices
- [sec-crypto-random](sec-crypto-random.md) - cryptographic randomness for tokens and keys
- [sec-error-message-leakage](sec-error-message-leakage.md) - generic user errors, detailed logs
- [sec-fd-cloexec](sec-fd-cloexec.md) - close-on-exec for sensitive descriptors
- [sec-integer-overflow](sec-integer-overflow.md) - guard size arithmetic against wraparound
- [sec-no-command-injection](sec-no-command-injection.md) - no untrusted input into a shell
- [sec-no-format-string](sec-no-format-string.md) - external input is data, never the format
- [sec-no-hardcoded-secrets](sec-no-hardcoded-secrets.md) - credentials come from outside the source
- [sec-no-type-punning](sec-no-type-punning.md) - bit_cast instead of aliasing pointer casts
- [sec-path-traversal](sec-path-traversal.md) - canonicalize and confine untrusted paths
- [sec-safe-string-functions](sec-safe-string-functions.md) - no unbounded string copies
- [sec-secure-temp-files](sec-secure-temp-files.md) - atomic temporary file creation

## str - Strings and text (12)

- [str-byte-vs-char](str-byte-vs-char.md) - std::byte for bytes that are not characters
- [str-cstr-boundary](str-cstr-boundary.md) - c_str only at the C boundary
- [str-ctype-unsigned](str-ctype-unsigned.md) - unsigned char before ctype calls
- [str-getline](str-getline.md) - getline for line-oriented input
- [str-npos-check](str-npos-check.md) - check find results against npos
- [str-own-with-string](str-own-with-string.md) - std::string owns character sequences
- [str-parse-numbers](str-parse-numbers.md) - from_chars for parsing numbers from text
- [str-quoted](str-quoted.md) - std::quoted round-trips strings with spaces
- [str-starts-with](str-starts-with.md) - named predicates over compare arithmetic
- [str-substr-view](str-substr-view.md) - substrings as views when no copy is needed
- [str-view-invalidation](str-view-invalidation.md) - views die when the string changes
- [str-view-lifetime](str-view-lifetime.md) - views must not outlive their string

## style - Style and readability (9)

- [style-auto](style-auto.md) - use auto to avoid repeating type names
- [style-consistent-naming](style-consistent-naming.md) - use one naming convention consistently
- [style-const-notation](style-const-notation.md) - use conventional const notation
- [style-name-length](style-name-length.md) - scale name length with scope
- [style-no-confusable-names](style-no-confusable-names.md) - avoid names that are easily misread
- [style-no-type-in-name](style-no-type-in-name.md) - do not encode types in names
- [style-one-declaration](style-one-declaration.md) - declare one name per declaration
- [style-readable-literals](style-readable-literals.md) - write long literals with digit separators
- [style-switch-over-if](style-switch-over-if.md) - use switch when choosing among values

## test - Testing (12)

- [test-data-driven](test-data-driven.md) - table-driven cases instead of copy-pasted tests
- [test-error-paths](test-error-paths.md) - test the failure paths, not only the happy path
- [test-failure-output](test-failure-output.md) - failure output carries the values that failed
- [test-fixture-raii](test-fixture-raii.md) - per-test setup and cleanup via an RAII fixture
- [test-fuzz-entry](test-fuzz-entry.md) - libFuzzer entry point for every parser
- [test-hermetic](test-hermetic.md) - no machine-specific paths or ambient environment
- [test-interface-seams](test-interface-seams.md) - depend on interfaces at test seams
- [test-isolation](test-isolation.md) - tests own their state and pass in any order
- [test-sanitizers](test-sanitizers.md) - run tests under AddressSanitizer and UBSan
- [test-seeded-random](test-seeded-random.md) - seed RNGs explicitly so failures reproduce
- [test-static-assert](test-static-assert.md) - compile-time invariants as static_assert
- [test-temp-raii](test-temp-raii.md) - unique temporary directory per test, RAII cleanup

## tmpl - Templates and generic programming (10)

- [tmpl-alias](tmpl-alias.md) - name families of types with alias templates
- [tmpl-ctad](tmpl-ctad.md) - let class template arguments be deduced from the initializer
- [tmpl-dependent-names](tmpl-dependent-names.md) - disambiguate dependent names with typename and template
- [tmpl-forwarding-greedy](tmpl-forwarding-greedy.md) - do not leave widely used templates unconstrained
- [tmpl-forwarding-reference](tmpl-forwarding-reference.md) - forward values through templates with T&& and std::forward
- [tmpl-generic-algorithm](tmpl-generic-algorithm.md) - express algorithms once with templates
- [tmpl-specialization](tmpl-specialization.md) - specialize class templates for irregular types
- [tmpl-specialize-function](tmpl-specialize-function.md) - overload function templates instead of specializing them
- [tmpl-tag-dispatch](tmpl-tag-dispatch.md) - select implementations with tag dispatch
- [tmpl-variadic-fold](tmpl-variadic-fold.md) - reduce parameter packs with fold expressions

## trait - Concepts and type traits (9)

- [trait-check-class](trait-check-class.md) - assert which concepts a class models
- [trait-constrain-templates](trait-constrain-templates.md) - state the requirements of every template parameter
- [trait-declval](trait-declval.md) - use std::declval for hypothetical values in traits
- [trait-enable-if-legacy](trait-enable-if-legacy.md) - use enable_if only where concepts are unavailable
- [trait-minimal-requirements](trait-minimal-requirements.md) - require only the properties the template uses
- [trait-requires-expression](trait-requires-expression.md) - write ad-hoc requirements as requires-expressions
- [trait-shorthand](trait-shorthand.md) - use the shorthand form for single-type concepts
- [trait-standard-concepts](trait-standard-concepts.md) - use standard concepts before inventing new ones
- [trait-v-suffix](trait-v-suffix.md) - use the _v and _t helper forms of type traits

## type - Types and invariants (12)

- [type-class-invariant](type-class-invariant.md) - class with private data when an invariant exists
- [type-enum-class](type-enum-class.md) - enum class instead of unscoped enums
- [type-explicit-ctor](type-explicit-ctor.md) - single-argument constructors explicit by default
- [type-no-implicit-conversion-op](type-no-implicit-conversion-op.md) - no implicit conversion operators; named accessors
- [type-no-narrowing](type-no-narrowing.md) - range-check before narrowing numeric conversions
- [type-override](type-override.md) - mark overrides with override; one of virtual/override/final
- [type-parse-at-boundary](type-parse-at-boundary.md) - parse untrusted input into validated types at the boundary
- [type-regular-value-types](type-regular-value-types.md) - prefer regular value types; hierarchies for open polymorphism
- [type-span](type-span.md) - pass sequences as std::span, not pointer and size
- [type-string-view](type-string-view.md) - read-only string parameters as std::string_view
- [type-strong-types](type-strong-types.md) - distinct meanings get distinct types
- [type-variant-over-union](type-variant-over-union.md) - std::variant instead of tagged unions

## unsafe - Undefined behavior and dangerous constructs (12)

- [unsafe-goto](unsafe-goto.md) - avoid goto; express the exit in the control flow
- [unsafe-invalid-downcast](unsafe-invalid-downcast.md) - downcast only with a runtime check
- [unsafe-memcpy-overlap](unsafe-memcpy-overlap.md) - memmove when source and destination overlap
- [unsafe-no-deref-invalid](unsafe-no-deref-invalid.md) - never dereference a null or invalid pointer
- [unsafe-out-of-bounds](unsafe-out-of-bounds.md) - keep array accesses inside the bounds
- [unsafe-placement-new](unsafe-placement-new.md) - reuse storage only after ending the old object's lifetime
- [unsafe-pointer-compare](unsafe-pointer-compare.md) - compare pointers only within the same array
- [unsafe-return-local-address](unsafe-return-local-address.md) - never return the address of a local object
- [unsafe-shift-range](unsafe-shift-range.md) - check shift counts before shifting
- [unsafe-uninitialized-read](unsafe-uninitialized-read.md) - initialize every object before reading it
- [unsafe-unsequenced](unsafe-unsequenced.md) - no unsequenced double modifications of one scalar
- [unsafe-use-after-lifetime](unsafe-use-after-lifetime.md) - do not use an object after its lifetime ends

Batch status: batches 1-13 (`err`, `raii`, `type`, `api`, `conc`, `perf`, `test`, `mem`, `obs`, `sec`, `io`, `doc`, `num`, `str`, `macro`, `coll`, `const`, `proj`, `ffi`, `unsafe`, `ptr`, `tmpl`, `trait`, `init`, `anti`) fully verified (292/292); batch 14 `async`/`data`/`lint`/`pat`/`style` authored.
