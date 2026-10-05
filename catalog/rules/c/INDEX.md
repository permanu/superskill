# C Rules Index

Baseline: latest
Rules: 265 (verified: 265)

_Plan complete: 265 rules across 25 prefixes. Batches 1-8 verified; 9 `ffi` (12) + `lint` (12) mostly verified with 4 fixes in re-check; 10 `conc` (12) + `data` (12) in verification; 11 `api` (4), `const` (3), `net` (2), `perf` (4), `test` (4), `type` (6)._

## anti - Anti-patterns (12)

- [anti-abbreviations](anti-abbreviations.md) - Name identifiers for their meaning, not a puzzle
- [anti-assignment-in-condition](anti-assignment-in-condition.md) - Do not perform assignments in selection statements
- [anti-deep-nesting](anti-deep-nesting.md) - Flatten deep nesting with guard clauses
- [anti-extern-functions](anti-extern-functions.md) - Do not write extern on function declarations
- [anti-fflush-input](anti-fflush-input.md) - Do not call fflush on an input stream
- [anti-function-macro](anti-function-macro.md) - Do not use function-like macros where a function will do
- [anti-goto-control-flow](anti-goto-control-flow.md) - Do not use goto for ordinary control flow
- [anti-ifdef-in-source](anti-ifdef-in-source.md) - Keep preprocessor conditionals out of source files
- [anti-inline-abuse](anti-inline-abuse.md) - Do not mark every function inline
- [anti-long-function](anti-long-function.md) - Keep functions to one job and a few screenfuls
- [anti-shadowing](anti-shadowing.md) - Do not reuse a variable name in a nested scope
- [anti-typedef-struct-pointer](anti-typedef-struct-pointer.md) - Do not typedef structures and pointers

## api - Public API and header design (4)

- [api-commit-rollback](api-commit-rollback.md) - Leave state unchanged when an update fails
- [api-destroy-function](api-destroy-function.md) - Release library objects through a destroy function
- [api-error-policy](api-error-policy.md) - Adopt one error convention for every entry point
- [api-validate-params](api-validate-params.md) - Validate parameters in the callee before use

## conc - Concurrency, atomics, signals (12)

- [conc-atomic-shared](conc-atomic-shared.md) - Make every cross-thread variable atomic or mutex-protected
- [conc-cv-loop](conc-cv-loop.md) - Wait on a condition variable in a loop that re-tests the predicate
- [conc-lock-order](conc-lock-order.md) - Lock multiple mutexes in one predefined order
- [conc-memory-order](conc-memory-order.md) - Pair weaker memory orders or use the default sequential consistency
- [conc-mutex-relock](conc-mutex-relock.md) - Do not lock the same fast mutex twice
- [conc-once](conc-once.md) - Initialize shared state exactly once with pthread_once
- [conc-reentrant-functions](conc-reentrant-functions.md) - Use the reentrant variants of library functions in threaded code
- [conc-sigaction](conc-sigaction.md) - Install signal handlers with sigaction, not signal
- [conc-signal-shared](conc-signal-shared.md) - Touch only sig_atomic_t or lock-free atomics in a signal handler
- [conc-thread-args](conc-thread-args.md) - Keep thread arguments alive until the thread is joined
- [conc-thread-join](conc-thread-join.md) - Join or detach every thread you create
- [conc-volatile-not-sync](conc-volatile-not-sync.md) - Volatile is not synchronization; use atomics for shared flags

## const - const correctness and compile-time constants (3)

- [const-local-readonly](const-local-readonly.md) - Qualify locals that are computed once and never reassigned
- [const-pointer-fixed](const-pointer-fixed.md) - Const-qualify the pointer itself when the address must not change
- [const-string-literals](const-string-literals.md) - Store string literals in const char pointers

## conv - Conversions, promotions, narrowing (12)

- [conv-bitwise-unsigned](conv-bitwise-unsigned.md) - Apply bitwise operators to unsigned operands only
- [conv-checked-narrow](conv-checked-narrow.md) - Check the destination range before every narrowing integer conversion
- [conv-endian-explicit](conv-endian-explicit.md) - Serialize multibyte integers byte by byte, never as memory dumps
- [conv-enum-underlying](conv-enum-underlying.md) - Give enums that cross a boundary a fixed underlying type
- [conv-fixed-width](conv-fixed-width.md) - Use fixed-width integer types in wire formats and binary structures
- [conv-float-narrowing](conv-float-narrowing.md) - Check the range before narrowing a floating-point value
- [conv-mixed-signs](conv-mixed-signs.md) - Keep signed and unsigned values in separate domains and test the sign before mixing
- [conv-pointer-difference](conv-pointer-difference.md) - Store pointer differences in ptrdiff_t
- [conv-printf-length](conv-printf-length.md) - Match printf length modifiers to the argument type using the inttypes macros
- [conv-promotion](conv-promotion.md) - Account for integer promotion, small types compute as int
- [conv-size-type](conv-size-type.md) - Use size_t for sizes, indices, and lengths
- [conv-unsigned-underflow](conv-unsigned-underflow.md) - Compare before subtracting unsigned values

## data - Data structures and algorithms (12)

- [data-array-bounds-library](data-array-bounds-library.md) - Keep every pointer and size pair passed to a library function valid
- [data-array-zero-init](data-array-zero-init.md) - Zero-initialize whole arrays with an empty or partial initializer
- [data-bsearch-sorted](data-bsearch-sorted.md) - Search with bsearch only the array sorted by the same comparator
- [data-hash-unsigned](data-hash-unsigned.md) - Compute hashes and checksums in unsigned arithmetic
- [data-iterator-invalidation](data-iterator-invalidation.md) - Reacquire pointers into an array after it grows
- [data-memcpy-shallow](data-memcpy-shallow.md) - memcpy copies pointers, not the objects they point to
- [data-pointer-iteration](data-pointer-iteration.md) - Iterate with a begin pointer and a one-past-the-end sentinel
- [data-qsort-comparator](data-qsort-comparator.md) - Give qsort a total-order comparator without arithmetic overflow
- [data-qsort-stability](data-qsort-stability.md) - Add a tie-breaker when the order of equal elements matters
- [data-scaled-pointer](data-scaled-pointer.md) - Never add a byte count to a non-character pointer
- [data-static-const-table](data-static-const-table.md) - Put lookup tables in static const storage
- [data-strncmp-vs-memcmp](data-strncmp-vs-memcmp.md) - Compare fixed-size binary keys with memcmp, not strncmp

## doc - Documentation and comments (12)

- [doc-contract](doc-contract.md) - Document the contract of every public function at its declaration
- [doc-data-comments](doc-data-comments.md) - Declare one object per line and comment what each one holds
- [doc-deprecated](doc-deprecated.md) - Mark retiring APIs with the deprecated attribute and a replacement
- [doc-doxygen-brief](doc-doxygen-brief.md) - Open each documented entity with a one-line brief description
- [doc-doxygen-params](doc-doxygen-params.md) - Document each parameter and return value with structured commands
- [doc-endif](doc-endif.md) - Annotate every #endif with the condition it closes
- [doc-failure-returns](doc-failure-returns.md) - Document every failure return value explicitly
- [doc-file-purpose](doc-file-purpose.md) - Give every source file a header comment stating its purpose
- [doc-nodiscard-reason](doc-nodiscard-reason.md) - Give nodiscard attributes a reason string
- [doc-param-names](doc-param-names.md) - Name the parameters in every function declaration
- [doc-static-assert](doc-static-assert.md) - Document layout and size assumptions with static_assert
- [doc-what-not-how](doc-what-not-how.md) - Write comments about intent, not about the mechanics of the code

## err - Error handling (15)

- [err-alloc-failure](err-alloc-failure.md) - Treat allocation failure as an ordinary error and keep the old block valid when realloc fails
- [err-check-return-values](err-check-return-values.md) - Consume every failure-reporting return value and annotate checked-return APIs with nodiscard
- [err-ckd-arithmetic](err-ckd-arithmetic.md) - Compute sizes and offsets with checked integer arithmetic and act on the overflow flag
- [err-detect-not-exit](err-detect-not-exit.md) - Detect and report errors in library code and let the application choose termination
- [err-eintr-retry](err-eintr-retry.md) - Retry interrupted I/O and loop until the requested transfer completes or fails for real
- [err-errno-after-failure](err-errno-after-failure.md) - Read errno only after the call's own out-of-band return value reports failure
- [err-errno-capture](err-errno-capture.md) - Copy errno into a local immediately on failure, before any other call
- [err-errno-zero-before](err-errno-zero-before.md) - Clear errno before a call whose failure is visible only through errno
- [err-goto-cleanup](err-goto-cleanup.md) - Unwind multi-resource functions through one forward goto chain with named cleanup labels
- [err-log-once](err-log-once.md) - Log a failure exactly once at the layer that owns recovery and report it upward elsewhere
- [err-out-params](err-out-params.md) - Write out-parameters only after every fallible step has succeeded
- [err-partial-cleanup](err-partial-cleanup.md) - Give each acquisition stage its own cleanup label so partial failures release exactly what exists
- [err-sentinel-type](err-sentinel-type.md) - Store a sentinel-returning function's result in the function's own return type
- [err-status-return](err-status-return.md) - Report failure through an explicit status return instead of overloading a result value
- [err-strerror-copy](err-strerror-copy.md) - Copy strerror's text into caller-owned storage before the next call

## ffi - Interop and ABI boundaries (12)

- [ffi-dlsym-conversion](ffi-dlsym-conversion.md) - Distinguish a missing dlsym symbol from a null-valued one with dlerror
- [ffi-error-type](ffi-error-type.md) - Declare functions that return error numbers with a dedicated type
- [ffi-offset-width](ffi-offset-width.md) - Do not share raw off_t across builds; use a fixed-width offset
- [ffi-packed-struct](ffi-packed-struct.md) - Do not use packed structs as shared formats
- [ffi-setjmp-context](ffi-setjmp-context.md) - Use setjmp only in its allowed contexts and only for local recovery
- [ffi-shared-globals](ffi-shared-globals.md) - Do not share mutable globals across a boundary
- [ffi-shared-prototypes](ffi-shared-prototypes.md) - Declare each boundary function once, in the shared header
- [ffi-symbol-visibility](ffi-symbol-visibility.md) - Hide internal symbols in shared libraries
- [ffi-time-format](ffi-time-format.md) - Serialize time as fixed-width seconds, not time_t
- [ffi-va-copy](ffi-va-copy.md) - Copy a va_list before passing it to another consumer
- [ffi-versioned-struct](ffi-versioned-struct.md) - Give boundary structs a size field so they can grow
- [ffi-wchar-format](ffi-wchar-format.md) - Keep wchar_t out of shared formats

## io - I/O, files, streams (13)

- [io-binary-mode](io-binary-mode.md) - Open binary payloads in binary mode
- [io-clearerr-retry](io-clearerr-retry.md) - Clear the stream error indicator before retrying after a handled error
- [io-epipe](io-epipe.md) - Treat EPIPE as a normal pipe closure, not a failure
- [io-exclusive-create](io-exclusive-create.md) - Create files that must not be clobbered with exclusive mode
- [io-fclose-check](io-fclose-check.md) - Check the result of fclose on streams that were written to
- [io-fgets-newline](io-fgets-newline.md) - Strip a newline with strchr, never with strlen minus one
- [io-format-string-literal](io-format-string-literal.md) - Never pass input-controlled text as a format string
- [io-fread-loop](io-fread-loop.md) - Loop until a read fills the requested amount or the stream ends
- [io-fseek-check](io-fseek-check.md) - Check fseek's result before reading from the new position
- [io-no-alternating-io](io-no-alternating-io.md) - Flush or reposition between output and input on an update stream
- [io-scanf-width](io-scanf-width.md) - Bound %s and %[ conversions with a field width
- [io-setvbuf-first](io-setvbuf-first.md) - Set stream buffering before any other operation on the stream
- [io-snprintf-truncation](io-snprintf-truncation.md) - Treat snprintf's return value at or above the buffer size as truncation

## lint - Static analysis and tooling (12)

- [lint-clang-tidy](lint-clang-tidy.md) - Run clang-tidy with the bugprone and cert check groups
- [lint-compile-commands](lint-compile-commands.md) - Generate a compile command database for tooling
- [lint-cppcheck](lint-cppcheck.md) - Run a compiler-independent analyzer as a second opinion
- [lint-float-equal](lint-float-equal.md) - Enable float-equal and replace exact comparisons with tolerances
- [lint-format-attribute](lint-format-attribute.md) - Annotate printf-style wrappers with the format attribute
- [lint-gcc-analyzer](lint-gcc-analyzer.md) - Run GCC's fanalyzer for path-sensitive diagnostics
- [lint-iwyu](lint-iwyu.md) - Keep includes to what the file actually uses
- [lint-nonnull-annotation](lint-nonnull-annotation.md) - Annotate non-null pointer parameters for the analyzers
- [lint-opt-in-warnings](lint-opt-in-warnings.md) - Enable the opt-in warning set beyond Wall
- [lint-strict-prototypes](lint-strict-prototypes.md) - Write void for parameterless functions and enable strict-prototypes
- [lint-suppression-scope](lint-suppression-scope.md) - Scope warning suppressions narrowly and save the state
- [lint-valgrind](lint-valgrind.md) - Run the test suite under Valgrind memcheck

## macro - Preprocessor and macros (12)

- [macro-constant-parens](macro-constant-parens.md) - Parenthesize macro bodies that contain expressions
- [macro-constexpr](macro-constexpr.md) - Use constexpr objects for typed compile-time constants
- [macro-defined-test](macro-defined-test.md) - Test macro existence with defined, not truthiness
- [macro-do-while](macro-do-while.md) - Wrap multi-statement macros in do while zero
- [macro-no-control-flow](macro-no-control-flow.md) - Macros must not contain return, break, or continue
- [macro-no-lvalue-args](macro-no-lvalue-args.md) - Do not design macros that are used as lvalues
- [macro-no-magic-names](macro-no-magic-names.md) - Macros must not depend on magic local names
- [macro-param-parens](macro-param-parens.md) - Parenthesize every parameter use in a macro body
- [macro-related-constants](macro-related-constants.md) - Prefer an enum to a chain of related object-like macros
- [macro-single-eval](macro-single-eval.md) - Never pass side-effecting arguments to an unsafe macro
- [macro-token-paste](macro-token-paste.md) - Expand arguments through a helper before token pasting
- [macro-va-opt](macro-va-opt.md) - Use __VA_OPT__ for optional variadic macro arguments

## mem - Memory management and lifetimes (14)

- [mem-aligned-alloc](mem-aligned-alloc.md) - Pass aligned_alloc a size that is a multiple of the alignment
- [mem-bounded-stack](mem-bounded-stack.md) - Bound every stack allocation and reject sizes from untrusted input
- [mem-clear-after-free](mem-clear-after-free.md) - Store a new value in the owning pointer immediately after free
- [mem-flex-array](mem-flex-array.md) - Allocate a flexible array member as offsetof plus count times element size
- [mem-matching-free](mem-matching-free.md) - Pass free only a pointer returned by an allocation function, never an interior address
- [mem-no-cast-malloc](mem-no-cast-malloc.md) - Do not cast the result of malloc; include stdlib.h and let void * convert implicitly
- [mem-no-dangling-return](mem-no-dangling-return.md) - Never return or retain a pointer to automatic storage
- [mem-overlap-copy](mem-overlap-copy.md) - Use memmove when source and destination ranges can overlap
- [mem-realloc-zero](mem-realloc-zero.md) - Free instead of calling realloc with a zero size
- [mem-single-owner](mem-single-owner.md) - Give every allocation a single owning pointer released at the same level of abstraction that allocated it
- [mem-sizeof-object](mem-sizeof-object.md) - Size each allocation with sizeof on the object expression it will store
- [mem-use-after-free](mem-use-after-free.md) - Do not access a block after free; end its lifetime after the last use
- [mem-zero-init](mem-zero-init.md) - Write every object before its first read
- [mem-zero-size](mem-zero-size.md) - Handle empty input explicitly instead of requesting a zero-length allocation

## net - Networking (POSIX sockets) (2)

- [net-message-framing](net-message-framing.md) - Frame stream messages explicitly with a length prefix
- [net-shutdown-eof](net-shutdown-eof.md) - Signal end-of-stream with shutdown before closing

## num - Numeric semantics and floating point (12)

- [num-abs-int-min](num-abs-int-min.md) - Check for the most-negative value before taking an absolute value
- [num-char-bit](num-char-bit.md) - Express byte widths in CHAR_BIT, not the literal 8
- [num-float-literals](num-float-literals.md) - Suffix float literals so arithmetic stays in the intended type
- [num-float-loop-counter](num-float-loop-counter.md) - Never use a floating-point value as a loop counter
- [num-float-model](num-float-model.md) - Guard code that depends on IEC 60559 semantics with the feature macro
- [num-float-print-roundtrip](num-float-print-roundtrip.md) - Print floating-point values with enough digits to round-trip
- [num-float-representation-compare](num-float-representation-compare.md) - Compare floating-point values with ==, never with object representations
- [num-int-min-division](num-int-min-division.md) - Guard the most-negative value before dividing or taking a remainder by minus one
- [num-integer-truncation](num-integer-truncation.md) - Account for integer division truncating toward zero
- [num-math-errors](num-math-errors.md) - Bounds-check math function inputs and detect domain and range errors
- [num-nan-compare](num-nan-compare.md) - Test for NaN before ordering or range comparisons
- [num-signed-overflow](num-signed-overflow.md) - Check operands before signed arithmetic that can overflow

## obs - Observability and logging (12)

- [obs-concise-message](obs-concise-message.md) - State what failed and the value that caused it
- [obs-debug-default-off](obs-debug-default-off.md) - Compile debug logging out by default
- [obs-exit-status](obs-exit-status.md) - Return a nonzero exit status when the program fails
- [obs-levels](obs-levels.md) - Classify messages by severity
- [obs-locale-independent](obs-locale-independent.md) - Emit machine-readable output in the C locale
- [obs-module-tag](obs-module-tag.md) - Tag every message with its module
- [obs-no-side-effect-args](obs-no-side-effect-args.md) - Keep side effects out of log arguments
- [obs-rate-limit](obs-rate-limit.md) - Report a repeating condition once
- [obs-runtime-verbosity](obs-runtime-verbosity.md) - Control verbosity from configuration, not by editing the source
- [obs-signal-handler](obs-signal-handler.md) - Never call the logging path from a signal handler
- [obs-single-interface](obs-single-interface.md) - Route messages through one logging interface
- [obs-stderr-vs-stdout](obs-stderr-vs-stdout.md) - Send diagnostics to stderr and data to stdout

## pat - Patterns (12)

- [pat-array-size](pat-array-size.md) - Compute array length with an ARRAY_SIZE macro at the declaration site
- [pat-callback-context](pat-callback-context.md) - Give every callback a user context pointer
- [pat-designated-init](pat-designated-init.md) - Initialize configuration structs with designated initializers
- [pat-dispatch-table](pat-dispatch-table.md) - Replace operation switches with a static table of function pointers
- [pat-dynarray](pat-dynarray.md) - Keep growable arrays in a struct that tracks length and capacity
- [pat-error-context](pat-error-context.md) - Return detailed errors through a caller-provided context struct
- [pat-init-destroy](pat-init-destroy.md) - Give each subsystem an explicit start and stop pair
- [pat-length-prefixed](pat-length-prefixed.md) - Carry untrusted strings as a pointer plus length
- [pat-opaque-type](pat-opaque-type.md) - Hide a type's layout behind an opaque declaration
- [pat-refcount](pat-refcount.md) - Reference-count shared objects with explicit get and put
- [pat-tagged-union](pat-tagged-union.md) - Pair a union with a tag and read only the member the tag selects
- [pat-vtable](pat-vtable.md) - Model a polymorphic interface as a struct of function pointers

## perf - Performance and optimization (4)

- [perf-io-batching](perf-io-batching.md) - Let stdio batch small reads instead of one syscall per byte
- [perf-optimize-release](perf-optimize-release.md) - Ship and benchmark with optimization enabled
- [perf-pgo](perf-pgo.md) - Use profile-guided optimization instead of hand-guessed branch hints
- [perf-restrict-hot-loops](perf-restrict-hot-loops.md) - Add restrict to hot loops whose buffers never alias

## proj - Build, packaging, project layout (12)

- [proj-assertions-build](proj-assertions-build.md) - Keep NDEBUG out of source files and test a build with assertions enabled
- [proj-feature-macros](proj-feature-macros.md) - Define feature-test macros before the first include
- [proj-format](proj-format.md) - Enforce one formatter configuration and check it in CI
- [proj-fuzzing](proj-fuzzing.md) - Expose parsers as pure functions a fuzzer can drive
- [proj-header-declarations](proj-header-declarations.md) - Headers declare, sources define
- [proj-include-guards](proj-include-guards.md) - Wrap every header in an include guard with a non-reserved macro name
- [proj-internal-linkage](proj-internal-linkage.md) - Give helpers internal linkage with static
- [proj-language-standard](proj-language-standard.md) - Compile with an explicit standard version and no GNU dialect
- [proj-reserved-identifiers](proj-reserved-identifiers.md) - Never declare or define an identifier reserved by the standard
- [proj-sanitizers](proj-sanitizers.md) - Run the test suite under the undefined-behavior and address sanitizers
- [proj-static-analysis](proj-static-analysis.md) - Run the static analyzer over the build in CI
- [proj-warning-level](proj-warning-level.md) - Fix the condition a warning reports instead of silencing it

## ptr - Pointers, aliasing, qualifiers (14)

- [ptr-alignment-cast](ptr-alignment-cast.md) - Do not cast to a pointer type with stricter alignment than the original
- [ptr-bounds-arith](ptr-bounds-arith.md) - Keep pointer arithmetic inside one array object; one past the end may be formed but not dereferenced
- [ptr-byte-access](ptr-byte-access.md) - Read and write object bytes through unsigned char pointers
- [ptr-const-params](ptr-const-params.md) - Declare pointer parameters const when the callee does not write through them
- [ptr-count-explicit](ptr-count-explicit.md) - Carry the element count with the pointer instead of recovering it with sizeof
- [ptr-fn-pointer-cast](ptr-fn-pointer-cast.md) - Invoke function pointers only through their declared function type
- [ptr-integer-roundtrip](ptr-integer-roundtrip.md) - Round-trip pointers only through intptr_t or uintptr_t, never a narrower integer
- [ptr-no-const-cast](ptr-no-const-cast.md) - Never cast away const and write through the result
- [ptr-null-check](ptr-null-check.md) - Validate pointer arguments for null before dereferencing them
- [ptr-nullptr](ptr-nullptr.md) - Use nullptr for null pointer values in new code
- [ptr-offsetof](ptr-offsetof.md) - Compute member offsets with offsetof instead of assuming a layout
- [ptr-restrict-contract](ptr-restrict-contract.md) - Apply restrict only where the caller guarantees non-overlapping access
- [ptr-strict-alias](ptr-strict-alias.md) - Access an object only through its effective type, a compatible type, or a character type
- [ptr-string-termination](ptr-string-termination.md) - Pass null-terminated sequences only when the terminator is guaranteed

## sec - Security and hardening (14)

- [sec-assert-not-security](sec-assert-not-security.md) - Enforce security checks in production code, not in assert
- [sec-close-on-exec](sec-close-on-exec.md) - Open descriptors with close-on-exec so children cannot inherit them
- [sec-copy-env-results](sec-copy-env-results.md) - Copy values returned by getenv and friends before the next call
- [sec-descriptor-identity](sec-descriptor-identity.md) - Hold an open descriptor instead of re-identifying a file by name
- [sec-file-mode](sec-file-mode.md) - Create private files with owner-only permissions from the start
- [sec-hardcoded-secrets](sec-hardcoded-secrets.md) - Load secrets from outside the binary, never hard-code them
- [sec-no-adjacent-secrets](sec-no-adjacent-secrets.md) - Keep sensitive fields away from buffers that can overflow
- [sec-no-deprecated](sec-no-deprecated.md) - Replace obsolescent conversion functions with the checked strtol family
- [sec-no-system](sec-no-system.md) - Do not call system(); execute programs directly
- [sec-random](sec-random.md) - Use the operating system's randomness for tokens, not rand()
- [sec-sanitize-subsystem](sec-sanitize-subsystem.md) - Allowlist characters before passing data to a complex subsystem
- [sec-secure-directory](sec-secure-directory.md) - Perform file operations in a directory others cannot modify
- [sec-string-bounds](sec-string-bounds.md) - Size string storage for the data plus the terminator
- [sec-wipe-secrets](sec-wipe-secrets.md) - Wipe sensitive buffers with a primitive the optimizer cannot remove

## style - Style and readability (12)

- [style-blank-line-functions](style-blank-line-functions.md) - Separate function definitions with a single blank line
- [style-bool](style-bool.md) - Use bool for values that are true or false
- [style-brace-placement](style-brace-placement.md) - Place braces K&R style with functions opening on the next line
- [style-braces-both-branches](style-braces-both-branches.md) - Use braces on both branches when either branch needs them
- [style-comment-blocks](style-comment-blocks.md) - Write multi-line comments in the project's block style
- [style-constants-caps](style-constants-caps.md) - Capitalize macro and enumeration constants
- [style-keyword-spacing](style-keyword-spacing.md) - Space keywords like statements and operators, not like functions
- [style-line-length](style-line-length.md) - Keep lines within the project's column limit and break them sensibly
- [style-lowercase-names](style-lowercase-names.md) - Name functions and variables in lowercase with underscores
- [style-one-statement-per-line](style-one-statement-per-line.md) - Put one statement and one assignment per line
- [style-pointer-star](style-pointer-star.md) - Attach the pointer star to the name, not the type
- [style-switch-align](style-switch-align.md) - Align case labels with the switch keyword

## test - Testing, fuzzing, sanitizers (4)

- [test-coverage](test-coverage.md) - Give each case its own branch, or enable MC/DC, when every sub-condition must be tested
- [test-deterministic-compare](test-deterministic-compare.md) - Give test comparisons a total order so results are deterministic
- [test-seed-prng](test-seed-prng.md) - Seed the PRNG from the test, not from the clock
- [test-tsan-threaded](test-tsan-threaded.md) - Run threaded tests under ThreadSanitizer

## type - Types, declarations, qualifiers (6)

- [type-alignas](type-alignas.md) - Apply alignas when an access pattern needs more alignment than the default
- [type-alignof](type-alignof.md) - Query alignment with alignof instead of assuming a value
- [type-bit-int](type-bit-int.md) - Use _BitInt for exact widths the fixed types do not cover
- [type-generic](type-generic.md) - Dispatch on type with _Generic instead of parallel accessor names
- [type-intmax](type-intmax.md) - Use intmax_t and uintmax_t for the widest integer values
- [type-static-array-min](type-static-array-min.md) - State a minimum element count with the static array parameter form

## unsafe - Undefined behavior and portability (16)

- [unsafe-assert-side-effects](unsafe-assert-side-effects.md) - Keep side effects out of assert expressions
- [unsafe-bitfield-layout](unsafe-bitfield-layout.md) - Serialize bit-fields with explicit arithmetic, not memory layout
- [unsafe-char-signedness](unsafe-char-signedness.md) - Use unsigned char when a char value must be read as a byte
- [unsafe-copy-bounds](unsafe-copy-bounds.md) - Never copy more bytes than the destination can hold
- [unsafe-ctype-domain](unsafe-ctype-domain.md) - Cast to unsigned char before calling ctype functions
- [unsafe-divide-zero](unsafe-divide-zero.md) - Guard every division and remainder by a nonzero divisor
- [unsafe-eval-order](unsafe-eval-order.md) - Give each modification of a scalar its own statement
- [unsafe-float-int-cast](unsafe-float-int-cast.md) - Check floating-point values before converting to integers
- [unsafe-null-arith](unsafe-null-arith.md) - Advance pointers only into arrays, never into arbitrary objects
- [unsafe-null-memargs](unsafe-null-memargs.md) - Do not pass null pointers to memcpy or memset, even for zero bytes
- [unsafe-padding-compare](unsafe-padding-compare.md) - Compare struct fields, not the bytes that include padding
- [unsafe-pointer-compare](unsafe-pointer-compare.md) - Compare pointers only within the same array object
- [unsafe-setjmp-volatile](unsafe-setjmp-volatile.md) - Declare locals changed across longjmp as volatile
- [unsafe-shift-range](unsafe-shift-range.md) - Keep shift counts inside the operand's width
- [unsafe-union-active](unsafe-union-active.md) - Pun types with memcpy, not by reading an inactive union member
- [unsafe-va-arg](unsafe-va-arg.md) - Read variadic arguments with their promoted type
