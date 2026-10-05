# Java Rules Index

Baseline: latest
Rules: 303 (verified: 303)

## ann - Annotations and reflection (5)

- [ann-getdeclaredmethod](ann-getdeclaredmethod.md) - Choose getMethod and getDeclaredMethod by visibility.
- [ann-inherited](ann-inherited.md) - Mark class annotations @Inherited when subclasses should see them.
- [ann-invocation-target](ann-invocation-target.md) - Unwrap InvocationTargetException to reach the real failure.
- [ann-runtime-retention](ann-runtime-retention.md) - Give reflectively read annotations RUNTIME retention.
- [ann-source-retention](ann-source-retention.md) - Use SOURCE retention for build-time-only annotations.

## anti - Anti-patterns (12)

- [anti-default-charset](anti-default-charset.md) - Do not convert bytes to text with the default charset.
- [anti-equals-incompatible](anti-equals-incompatible.md) - Do not compare objects of incompatible types with equals.
- [anti-list-of-null](anti-list-of-null.md) - Do not use List.of for collections that may contain null.
- [anti-missing-enum-cases](anti-missing-enum-cases.md) - Handle every enum constant or say why the default cannot happen.
- [anti-primitive-varargs](anti-primitive-varargs.md) - Do not pass a primitive array as the only varargs argument.
- [anti-reference-equality](anti-reference-equality.md) - Compare objects by value, not by identity.
- [anti-self-assignment](anti-self-assignment.md) - Do not assign a variable to itself.
- [anti-self-comparison](anti-self-comparison.md) - Do not compare a value with itself.
- [anti-static-mutable](anti-static-mutable.md) - Do not keep mutable static state.
- [anti-string-splitter](anti-string-splitter.md) - Do not rely on split's default trailing-empty behavior.
- [anti-type-param-unused](anti-type-param-unused.md) - Do not declare a type parameter that only appears in the return type.
- [anti-unused-variable](anti-unused-variable.md) - Remove unused variables.

## api - API design (14)

- [api-check-return-value](api-check-return-value.md) - Use the value a non-void method returns.
- [api-comparable-consistent](api-comparable-consistent.md) - Keep compareTo consistent with equals.
- [api-copy-input-collections](api-copy-input-collections.md) - Copy caller-supplied collections in constructors.
- [api-default-method-evolution](api-default-method-evolution.md) - Add new interface methods as default methods.
- [api-deprecate-with-replacement](api-deprecate-with-replacement.md) - Name the replacement when deprecating.
- [api-equals-hashcode](api-equals-hashcode.md) - Override hashCode whenever you override equals.
- [api-functional-interface](api-functional-interface.md) - Annotate lambda-target interfaces with @FunctionalInterface.
- [api-immutable-exposure](api-immutable-exposure.md) - Return unmodifiable copies of internal collections.
- [api-interface-first](api-interface-first.md) - Define behavior contracts as interfaces.
- [api-no-finalize](api-no-finalize.md) - Never override finalize; use close() or Cleaner.
- [api-override-annotation](api-override-annotation.md) - Annotate every override with @Override.
- [api-serialversionuid](api-serialversionuid.md) - Declare an explicit serialVersionUID.
- [api-static-factory](api-static-factory.md) - Offer static factories instead of public constructors.
- [api-tostring](api-tostring.md) - Override toString on types with state.

## async - Asynchronous composition (13)

- [async-all-of](async-all-of.md) - Wait for a batch of stages with allOf.
- [async-any-of](async-any-of.md) - Race alternatives with anyOf.
- [async-completion-exception](async-completion-exception.md) - Catch CompletionException, not the original failure type.
- [async-exceptionally](async-exceptionally.md) - Recover a failed stage with exceptionally.
- [async-explicit-executor](async-explicit-executor.md) - Give blocking async work its own executor.
- [async-handle](async-handle.md) - Map both outcomes in one function with handle.
- [async-join-vs-get](async-join-vs-get.md) - Prefer join in composition code; get where interruption matters.
- [async-minimal-stage](async-minimal-stage.md) - Expose CompletionStage, not a completable future.
- [async-or-timeout](async-or-timeout.md) - Bound every asynchronous stage with a timeout.
- [async-then-combine](async-then-combine.md) - Combine independent stages with thenCombine.
- [async-then-compose](async-then-compose.md) - Use thenCompose when the next step returns a stage.
- [async-thread-identity](async-thread-identity.md) - Do not assume which thread runs a dependent stage.
- [async-when-complete](async-when-complete.md) - Observe completion with whenComplete, not a mapping call.

## coll - Collections (12)

- [coll-copy-on-write](coll-copy-on-write.md) - Use CopyOnWriteArrayList for listener lists.
- [coll-first-last](coll-first-last.md) - Use getFirst and getLast instead of index arithmetic.
- [coll-immutable-elements](coll-immutable-elements.md) - Keep map keys and set elements immutable while stored.
- [coll-immutable-factory](coll-immutable-factory.md) - Build fixed collections with List.of, Set.of, and Map.of.
- [coll-linked-map-order](coll-linked-map-order.md) - Preserve map iteration order with LinkedHashMap.
- [coll-map-compute-absent](coll-map-compute-absent.md) - Populate map entries with computeIfAbsent.
- [coll-map-get-or-default](coll-map-get-or-default.md) - Read map values with a fallback via getOrDefault.
- [coll-map-merge](coll-map-merge.md) - Accumulate map values with merge.
- [coll-priority-queue](coll-priority-queue.md) - Extract minimum or maximum repeatedly with PriorityQueue.
- [coll-remove-if](coll-remove-if.md) - Remove elements with removeIf or the iterator.
- [coll-set-membership](coll-set-membership.md) - Use a Set for membership tests, not a List.
- [coll-sub-list-view](coll-sub-list-view.md) - Treat subList results as views and copy when you need a snapshot.

## conc - Concurrency and virtual threads (20)

- [conc-atomic-counters](conc-atomic-counters.md) - Use atomic classes for shared counters.
- [conc-blocking-queue](conc-blocking-queue.md) - Hand off work between threads with a BlockingQueue.
- [conc-bounded-queue](conc-bounded-queue.md) - Bound queues to apply backpressure.
- [conc-concurrent-collections](conc-concurrent-collections.md) - Use concurrent collections for maps and sets shared across threads.
- [conc-daemon-background-threads](conc-daemon-background-threads.md) - Mark background platform threads as daemon.
- [conc-executor-close](conc-executor-close.md) - Close every ExecutorService you create.
- [conc-latch-not-poll](conc-latch-not-poll.md) - Wait on a synchronizer instead of polling a flag.
- [conc-lock-consistency](conc-lock-consistency.md) - Guard shared mutable state with the same lock.
- [conc-lock-finally](conc-lock-finally.md) - Unlock in a finally block.
- [conc-no-thread-stop](conc-no-thread-stop.md) - Interrupt a thread; never call Thread.stop.
- [conc-publish-before-start](conc-publish-before-start.md) - Publish state before starting the thread that reads it.
- [conc-threadlocal-cleanup](conc-threadlocal-cleanup.md) - Remove ThreadLocal values when the task ends.
- [conc-timed-poll](conc-timed-poll.md) - Use timed poll so workers can observe shutdown.
- [conc-volatile-visibility](conc-volatile-visibility.md) - Make shared flags volatile.
- [conc-vt-blocking-style](conc-vt-blocking-style.md) - Keep blocking sequential code on virtual threads.
- [conc-vt-limit-semaphore](conc-vt-limit-semaphore.md) - Limit concurrency with a Semaphore, not a thread pool.
- [conc-vt-no-threadlocal-cache](conc-vt-no-threadlocal-cache.md) - Do not cache per-thread resources in ThreadLocal.
- [conc-vt-not-cpu-bound](conc-vt-not-cpu-bound.md) - Run CPU-bound work on platform threads.
- [conc-vt-not-pooled](conc-vt-not-pooled.md) - Create a virtual thread per task.
- [conc-vt-pinning](conc-vt-pinning.md) - Avoid synchronized around blocking calls in virtual-thread code.

## const - Constants and immutability (4)

- [const-bigdecimal-constants](const-bigdecimal-constants.md) - Reuse BigDecimal's predefined constants.
- [const-enum-instead-of-int](const-enum-instead-of-int.md) - Model fixed sets with enums, not int constants.
- [const-static-final-immutable](const-static-final-immutable.md) - Make constants static final and deeply immutable.
- [const-value-based-no-sync](const-value-based-no-sync.md) - Never synchronize on a value-based instance.

## conv - Conversions (5)

- [conv-list-to-array](conv-list-to-array.md) - Convert collections to arrays with the generator form of toArray.
- [conv-objects-equals](conv-objects-equals.md) - Compare possibly-null values with Objects.equals.
- [conv-objects-to-string](conv-objects-to-string.md) - Render possibly-null values with Objects.toString.
- [conv-radix-parse](conv-radix-parse.md) - Pass the radix to parseInt for non-decimal input.
- [conv-unsigned-parse](conv-unsigned-parse.md) - Parse unsigned values with parseUnsignedInt.

## data - Data access (7)

- [data-batch](data-batch.md) - Send bulk statements as a batch.
- [data-cancel](data-cancel.md) - Cancel statements that outlive their deadline.
- [data-fetch-size](data-fetch-size.md) - Set the fetch size for large result sets.
- [data-generated-keys](data-generated-keys.md) - Read generated keys from the insert, not a follow-up query.
- [data-next-exception](data-next-exception.md) - Walk the SQLException chain for the full failure.
- [data-transaction](data-transaction.md) - Wrap multi-statement writes in an explicit transaction.
- [data-was-null](data-was-null.md) - Distinguish SQL NULL from zero with wasNull.

## doc - Documentation (12)

- [doc-code](doc-code.md) - Wrap code fragments in {@code} instead of HTML escapes.
- [doc-comment-placement](doc-comment-placement.md) - Place the doc comment immediately before the declaration.
- [doc-link](doc-link.md) - Link program elements with {@link} instead of plain names.
- [doc-override-omit](doc-override-omit.md) - Do not repeat inherited documentation on overriding methods.
- [doc-package-info](doc-package-info.md) - Document packages in package-info.java.
- [doc-param](doc-param.md) - Give every parameter its own @param tag.
- [doc-public-coverage](doc-public-coverage.md) - Document every visible class and member with Javadoc.
- [doc-return](doc-return.md) - Document every non-void result with @return or {@return}.
- [doc-snippet](doc-snippet.md) - Show code examples with {@snippet}.
- [doc-summary-fragment](doc-summary-fragment.md) - Write the Javadoc summary as a phrase, not as "This method...".
- [doc-tags-order](doc-tags-order.md) - Keep block tags in the standard order.
- [doc-throws](doc-throws.md) - Document declared exceptions with @throws.

## err - Error handling (16)

- [err-catch-specific](err-catch-specific.md) - Catch the narrowest exception the code can actually handle.
- [err-checked-vs-unchecked](err-checked-vs-unchecked.md) - Checked for recoverable conditions, unchecked for programming errors.
- [err-custom-type](err-custom-type.md) - Give each distinct failure its own exception type.
- [err-fail-fast-args](err-fail-fast-args.md) - Validate arguments at method entry so failures point at the caller.
- [err-finally-normally](err-finally-normally.md) - Let finally blocks complete normally.
- [err-future-observed](err-future-observed.md) - Retrieve every submitted task's Future.
- [err-interrupt-restore](err-interrupt-restore.md) - Restore the interrupt flag when propagation is impossible.
- [err-multicatch](err-multicatch.md) - Merge exception types that share one recovery path.
- [err-no-catch-throwable](err-no-catch-throwable.md) - Never catch Error or Throwable.
- [err-no-empty-catch](err-no-empty-catch.md) - Take a named action or justify the no-op.
- [err-optional-return](err-optional-return.md) - Return Optional from finders instead of null.
- [err-retry-idempotent](err-retry-idempotent.md) - Retry only idempotent operations.
- [err-suppressed-cleanup](err-suppressed-cleanup.md) - Attach cleanup failures with addSuppressed.
- [err-try-with-resources](err-try-with-resources.md) - Acquire every AutoCloseable in try-with-resources.
- [err-vt-uncaught-handler](err-vt-uncaught-handler.md) - Route uncaught thread failures into the logging pipeline.
- [err-wrap-cause](err-wrap-cause.md) - Wrap a lower-level failure with its cause.

## ffi - Native interop (FFM) (4)

- [ffi-downcall](ffi-downcall.md) - Call native functions through a Linker downcall handle.
- [ffi-memory-access](ffi-memory-access.md) - Access native memory through layout-typed MemorySegment reads.
- [ffi-symbol-lookup](ffi-symbol-lookup.md) - Locate foreign functions with a SymbolLookup.
- [ffi-upcall](ffi-upcall.md) - Expose Java callbacks with upcallStub.

## gen - Generics (12)

- [gen-bounded-type-params](gen-bounded-type-params.md) - Bound type parameters to the operations the code needs.
- [gen-diamond-inference](gen-diamond-inference.md) - Use the diamond operator instead of repeating type arguments.
- [gen-generic-parameters](gen-generic-parameters.md) - Parameterize types instead of casting Object results.
- [gen-instanceof-wildcard](gen-instanceof-wildcard.md) - Use an unbounded wildcard in instanceof tests of generic types.
- [gen-no-parameterized-arrays](gen-no-parameterized-arrays.md) - Store collections of parameterized types in lists, not arrays.
- [gen-raw-types](gen-raw-types.md) - Avoid raw types for generic classes and interfaces.
- [gen-safevarargs](gen-safevarargs.md) - Mark provably safe generic varargs with @SafeVarargs.
- [gen-suppress-scope](gen-suppress-scope.md) - Scope @SuppressWarnings to the smallest element that needs it.
- [gen-type-param-names](gen-type-param-names.md) - Name type parameters by convention: E, T, T2, or RequestT.
- [gen-unbounded-wildcard](gen-unbounded-wildcard.md) - Use List<?> when only Object-level operations are needed.
- [gen-wildcard-pecs](gen-wildcard-pecs.md) - Choose extends or super wildcards from the data flow direction.
- [gen-wildcard-return](gen-wildcard-return.md) - Avoid wildcard types in return positions.

## io - I/O and resources (12)

- [io-atomic-move](io-atomic-move.md) - Publish files atomically with Files.move and ATOMIC_MOVE.
- [io-buffered-streams](io-buffered-streams.md) - Wrap byte streams in buffered streams before per-byte I/O.
- [io-charset-explicit](io-charset-explicit.md) - Pass the charset explicitly when reading or writing text files.
- [io-create-directories](io-create-directories.md) - Create parent directories with Files.createDirectories.
- [io-directory-stream-close](io-directory-stream-close.md) - Close DirectoryStream with try-with-resources.
- [io-lines-stream](io-lines-stream.md) - Stream large files line by line and close the returned stream.
- [io-malformed-report](io-malformed-report.md) - Decode untrusted text with REPORT, not silent REPLACE.
- [io-nio-over-file](io-nio-over-file.md) - Use java.nio.file Path and Files instead of java.io.File.
- [io-no-available](io-no-available.md) - Never size a buffer with InputStream.available().
- [io-path-resolve](io-path-resolve.md) - Build paths with Path.resolve, not string concatenation.
- [io-transfer-to](io-transfer-to.md) - Copy streams with InputStream.transferTo instead of a manual loop.
- [io-whole-file-text](io-whole-file-text.md) - Read and write whole text files with Files.readString and writeString.

## lint - Static analysis and tooling (12)

- [lint-array-equals](lint-array-equals.md) - Compare array contents with Arrays.equals.
- [lint-deprecation-clean](lint-deprecation-clean.md) - Fix deprecation warnings instead of accumulating them.
- [lint-doclint](lint-doclint.md) - Keep documentation comments clean for doclint.
- [lint-double-brace](lint-double-brace.md) - Avoid double-brace initialization.
- [lint-fallthrough-comment](lint-fallthrough-comment.md) - Mark intentional switch fall-through with a comment.
- [lint-format-string](lint-format-string.md) - Match format specifiers to their arguments.
- [lint-immutable-enum](lint-immutable-enum.md) - Keep enum fields final and deeply immutable.
- [lint-int-long-math](lint-int-long-math.md) - Widen before doing int arithmetic assigned to long.
- [lint-long-suffix](lint-long-suffix.md) - Write long literals with an uppercase L suffix.
- [lint-operator-precedence](lint-operator-precedence.md) - Parenthesize mixed operators.
- [lint-strict-build](lint-strict-build.md) - Compile with -Xlint and fail the build on warnings.
- [lint-string-case-locale](lint-string-case-locale.md) - Pass a Locale when changing case.

## mem - Memory and GC (12)

- [mem-arena-confined](mem-arena-confined.md) - Match the arena kind to the threads that touch the memory.
- [mem-arena-offheap](mem-arena-offheap.md) - Manage off-heap memory with an Arena you close.
- [mem-classvalue](mem-classvalue.md) - Use ClassValue for per-class derived values.
- [mem-cleaner-explicit-clean](mem-cleaner-explicit-clean.md) - Call clean() explicitly; the Cleaner is only a backstop.
- [mem-cleaner-no-capture](mem-cleaner-no-capture.md) - Never let a cleaning action reference the object being cleaned.
- [mem-lru-bound](mem-lru-bound.md) - Bound in-memory caches so they cannot grow without limit.
- [mem-reference-reachable](mem-reference-reachable.md) - Keep registered reference objects strongly reachable.
- [mem-refers-to](mem-refers-to.md) - Test referents with refersTo instead of comparing get().
- [mem-softref-cache](mem-softref-cache.md) - Treat soft references as caches that may be emptied at any time.
- [mem-system-gc](mem-system-gc.md) - Never call System.gc() to solve a memory problem.
- [mem-weak-cache](mem-weak-cache.md) - Use weak keys for caches that must not pin their entries.
- [mem-weakmap-value-keys](mem-weakmap-value-keys.md) - Keep WeakHashMap values free of strong references to their keys.

## net - Networking (5)

- [net-http-body-handlers](net-http-body-handlers.md) - Choose a BodyHandler instead of reading the stream by hand.
- [net-httpclient-async](net-httpclient-async.md) - Overlap requests with sendAsync.
- [net-httpclient-close](net-httpclient-close.md) - Close an HttpClient you own.
- [net-httpclient-reuse](net-httpclient-reuse.md) - Reuse one HttpClient instead of creating one per call.
- [net-httpclient-timeout](net-httpclient-timeout.md) - Give every HTTP request a timeout.

## num - Numbers and arithmetic (12)

- [num-bigdecimal-divide](num-bigdecimal-divide.md) - Give BigDecimal division a scale and rounding mode.
- [num-bigdecimal-equals](num-bigdecimal-equals.md) - Compare BigDecimal values with compareTo, not equals.
- [num-bigdecimal-money](num-bigdecimal-money.md) - Use BigDecimal for exact decimal arithmetic, not double.
- [num-bigdecimal-valueof](num-bigdecimal-valueof.md) - Convert doubles to BigDecimal with valueOf, not the constructor.
- [num-boxed-identity](num-boxed-identity.md) - Compare boxed numbers with equals, not reference equality.
- [num-double-compare](num-double-compare.md) - Order floating-point values with Double.compare.
- [num-double-equality](num-double-equality.md) - Do not test computed floating-point values for exact equality.
- [num-floor-mod](num-floor-mod.md) - Wrap negative indexes with Math.floorMod, not %.
- [num-nan-test](num-nan-test.md) - Test NaN with Double.isNaN, never with equality.
- [num-overflow-exact](num-overflow-exact.md) - Detect int and long overflow with the *Exact methods.
- [num-random-bound](num-random-bound.md) - Draw bounded random numbers with nextInt(bound), not modulo.
- [num-to-int-exact](num-to-int-exact.md) - Narrow long to int with Math.toIntExact, not a cast.

## obs - Observability (12)

- [obs-jfr-custom-event](obs-jfr-custom-event.md) - Define custom JFR events for domain operations.
- [obs-jfr-event-metadata](obs-jfr-event-metadata.md) - Label JFR events and fields.
- [obs-jfr-recording](obs-jfr-recording.md) - Scope JFR recordings with try-with-resources.
- [obs-jfr-should-commit](obs-jfr-should-commit.md) - Guard expensive event fields with shouldCommit().
- [obs-jul-configuration](obs-jul-configuration.md) - Leave level and handler choices to configuration.
- [obs-log-lazy-supplier](obs-log-lazy-supplier.md) - Build log messages inside a Supplier.
- [obs-log-levels](obs-log-levels.md) - Match the level to the operational response.
- [obs-log-throwable](obs-log-throwable.md) - Pass exceptions to the log call.
- [obs-logger-names](obs-logger-names.md) - Name loggers after the class or package.
- [obs-logger-not-stdout](obs-logger-not-stdout.md) - Log through a Logger, not System.out.
- [obs-name-threads](obs-name-threads.md) - Name the threads you start.
- [obs-system-logger](obs-system-logger.md) - Libraries log through System.Logger.

## opt - Optional and null safety (12)

- [opt-filter](opt-filter.md) - Express presence conditions with filter().
- [opt-flatmap](opt-flatmap.md) - Use flatMap() when the mapping function returns an Optional.
- [opt-if-present-else](opt-if-present-else.md) - Branch on presence with ifPresentOrElse.
- [opt-map-null](opt-map-null.md) - Let map() turn a null mapping result into an empty Optional.
- [opt-never-null](opt-never-null.md) - Never return null from a method declared to return Optional.
- [opt-of-nullable](opt-of-nullable.md) - Choose of() and ofNullable() from the null contract.
- [opt-or-chain](opt-or-chain.md) - Chain alternative sources with or().
- [opt-or-else-get](opt-or-else-get.md) - Use orElseGet() when the fallback must be computed.
- [opt-or-else-throw](opt-or-else-throw.md) - Replace isPresent-and-get with orElseThrow.
- [opt-require-non-null](opt-require-non-null.md) - Validate parameters with Objects.requireNonNull.
- [opt-return-type-only](opt-return-type-only.md) - Use Optional for return values, not for fields or parameters.
- [opt-stream](opt-stream.md) - Flatten streams of Optionals with Optional.stream().

## pat - Pattern matching (4)

- [pat-flow-scope](pat-flow-scope.md) - Rely on flow scoping after a negated pattern guard.
- [pat-nested-deconstruction](pat-nested-deconstruction.md) - Deconstruct nested records in one pattern.
- [pat-record-inference](pat-record-inference.md) - Let record patterns infer type arguments.
- [pat-switch-expression](pat-switch-expression.md) - Dispatch on patterns with switch expressions.

## perf - Performance (12)

- [perf-deque-over-stack](perf-deque-over-stack.md) - Use ArrayDeque instead of the legacy synchronized Stack.
- [perf-enum-set](perf-enum-set.md) - Use EnumSet for sets of enum constants.
- [perf-hashmap-capacity](perf-hashmap-capacity.md) - Size a HashMap for the expected entry count to avoid rehashing.
- [perf-jmh-measure](perf-jmh-measure.md) - Benchmark JVM code with JMH, not hand-rolled timing loops.
- [perf-linkedlist-indexing](perf-linkedlist-indexing.md) - Use ArrayList when code needs indexed access, not LinkedList.
- [perf-longadder](perf-longadder.md) - Use LongAdder for counters updated from many threads.
- [perf-parallel-stream-gate](perf-parallel-stream-gate.md) - Parallelize a stream only when the work per element pays for splitting.
- [perf-pattern-precompile](perf-pattern-precompile.md) - Compile a regular expression once and reuse the Pattern.
- [perf-stream-side-effects](perf-stream-side-effects.md) - Accumulate stream results with collect, not side effects.
- [perf-stream-stateless](perf-stream-stateless.md) - Keep stream lambdas stateless.
- [perf-stringbuilder-over-stringbuffer](perf-stringbuilder-over-stringbuffer.md) - Use StringBuilder instead of StringBuffer for single-threaded building.
- [perf-threadlocalrandom](perf-threadlocalrandom.md) - Use ThreadLocalRandom instead of a shared Random in concurrent code.

## proj - Build, dependencies, and modules (12)

- [proj-classloader-resource](proj-classloader-resource.md) - Load resources from the classpath, not the working directory.
- [proj-internal-api](proj-internal-api.md) - Do not depend on JDK-internal APIs.
- [proj-module-uses](proj-module-uses.md) - Declare uses for services a named module loads.
- [proj-named-package](proj-named-package.md) - Put every type in a named package.
- [proj-package-naming](proj-package-naming.md) - Name packages in lowercase reverse-DNS form.
- [proj-package-private](proj-package-private.md) - Use the most restrictive access level that works.
- [proj-process-builder](proj-process-builder.md) - Start external processes with ProcessBuilder.
- [proj-requires-static](proj-requires-static.md) - Mark compile-time-only dependencies with requires static.
- [proj-requires-transitive](proj-requires-transitive.md) - Re-export API dependencies with requires transitive.
- [proj-service-loader](proj-service-loader.md) - Load implementations through ServiceLoader, not hardcoded classes.
- [proj-service-loader-cache](proj-service-loader-cache.md) - Do not cache ServiceLoader instances VM-wide.
- [proj-system-property-defaults](proj-system-property-defaults.md) - Read configuration properties with an explicit default.

## sec - Security (16)

- [sec-constant-time-equal](sec-constant-time-equal.md) - Compare digests with MessageDigest.isEqual.
- [sec-deserialization-filter](sec-deserialization-filter.md) - Attach an ObjectInputFilter to ObjectInputStream.
- [sec-deserialization-untrusted](sec-deserialization-untrusted.md) - Keep ObjectInputStream off untrusted input paths.
- [sec-no-follow-links](sec-no-follow-links.md) - Resolve links before checking a path against its base.
- [sec-password-char-array](sec-password-char-array.md) - Hold passwords in char[] and clear them.
- [sec-path-traversal](sec-path-traversal.md) - Normalize and bound user-supplied paths.
- [sec-permissions](sec-permissions.md) - Set restrictive permissions on files that hold secrets.
- [sec-secure-random-reuse](sec-secure-random-reuse.md) - Share one SecureRandom instance.
- [sec-securerandom](sec-securerandom.md) - Generate tokens with SecureRandom.
- [sec-sql-prepared](sec-sql-prepared.md) - Build SQL with PreparedStatement placeholders.
- [sec-temp-file](sec-temp-file.md) - Create temporary files with Files.createTempFile.
- [sec-tls-verify](sec-tls-verify.md) - Never trust all certificates or disable hostname verification.
- [sec-tls-version](sec-tls-version.md) - Request TLS 1.3 or default negotiation.
- [sec-xml-external-protocols](sec-xml-external-protocols.md) - Restrict external DTD and schema access to the protocols you need.
- [sec-xxe-doctype](sec-xxe-doctype.md) - Disable DTDs and external entities.
- [sec-zip-slip](sec-zip-slip.md) - Bound archive entry paths before extracting.

## style - Style and formatting (12)

- [style-array-declaration](style-array-declaration.md) - Attach array brackets to the type, not the variable.
- [style-braces-always](style-braces-always.md) - Brace every if, else, for, do, and while body.
- [style-camel-case](style-camel-case.md) - Convert acronyms when naming types and members.
- [style-column-limit](style-column-limit.md) - Wrap code at 100 columns.
- [style-constant-names](style-constant-names.md) - Name constants in UPPER_SNAKE_CASE.
- [style-imports-no-wildcard](style-imports-no-wildcard.md) - Import types explicitly, never with wildcards.
- [style-imports-order](style-imports-order.md) - Group static imports first, then sort each group.
- [style-kr-braces](style-kr-braces.md) - Place braces in K&R style for nonempty blocks.
- [style-modifier-order](style-modifier-order.md) - Write modifiers in the JLS-recommended order.
- [style-one-top-level-class](style-one-top-level-class.md) - Put exactly one top-level class in each file.
- [style-one-variable-per-declaration](style-one-variable-per-declaration.md) - Declare one variable per declaration.
- [style-overloads-together](style-overloads-together.md) - Keep overloads of a method contiguous.

## test - Testing (16)

- [test-assert-all](test-assert-all.md) - Group related assertions with assertAll.
- [test-assert-message-lazy](test-assert-message-lazy.md) - Build assertion messages lazily with a Supplier.
- [test-assert-throws](test-assert-throws.md) - Use assertThrows instead of try/fail/catch.
- [test-assumptions](test-assumptions.md) - Skip environment-bound tests with assumptions.
- [test-disabled-reason](test-disabled-reason.md) - Give @Disabled a reason.
- [test-display-name](test-display-name.md) - Give tests human-readable display names.
- [test-dynamic-tests](test-dynamic-tests.md) - Generate runtime cases with @TestFactory.
- [test-inject-clock](test-inject-clock.md) - Inject a Clock instead of sleeping in tests.
- [test-naming](test-naming.md) - Name test classes and methods after the behavior.
- [test-nested](test-nested.md) - Group cases in @Nested classes.
- [test-no-order-dependency](test-no-order-dependency.md) - Reset shared state per test.
- [test-parameterized](test-parameterized.md) - Run the same test over several inputs.
- [test-per-class-lifecycle](test-per-class-lifecycle.md) - Share expensive setup with a per-class test instance.
- [test-tags](test-tags.md) - Tag slow or environment-bound tests.
- [test-tempdir](test-tempdir.md) - Use @TempDir for filesystem tests.
- [test-timeout](test-timeout.md) - Bound hanging tests with @Timeout.

## type - Types and data modeling (18)

- [type-enum-abstract-method](type-enum-abstract-method.md) - Prefer abstract methods over functional fields in enums.
- [type-enum-fixed-instances](type-enum-fixed-instances.md) - Use enums for fixed instance sets and sealed types for kinds.
- [type-enum-no-ordinal](type-enum-no-ordinal.md) - Persist enum constants by name, never by ordinal.
- [type-exhaustive-switch](type-exhaustive-switch.md) - Switch exhaustively over sealed hierarchies and omit default.
- [type-local-record](type-local-record.md) - Use a local record for intermediate aggregates.
- [type-pattern-instanceof](type-pattern-instanceof.md) - Bind the narrowed value in the instanceof pattern.
- [type-record-accessor-invariants](type-record-accessor-invariants.md) - Keep record accessors side-effect free.
- [type-record-accessor-override](type-record-accessor-override.md) - Annotate explicitly declared record accessors with @Override.
- [type-record-data-carrier](type-record-data-carrier.md) - Model immutable data carriers as records.
- [type-record-pattern](type-record-pattern.md) - Destructure records with record patterns.
- [type-record-validate](type-record-validate.md) - Validate invariants in the compact canonical constructor.
- [type-sealed-closed-kinds](type-sealed-closed-kinds.md) - Model closed alternative sets as sealed interfaces.
- [type-sealed-non-sealed](type-sealed-non-sealed.md) - Re-open a sealed branch deliberately with non-sealed.
- [type-sealed-permits-inferred](type-sealed-permits-inferred.md) - Let permits be inferred when implementations share the file.
- [type-sealed-public-alternatives](type-sealed-public-alternatives.md) - Expose alternatives through a public sealed type.
- [type-switch-guard](type-switch-guard.md) - Lift case refinements into when guards.
- [type-switch-null](type-switch-null.md) - Handle null with a case null label.
- [type-value-based-identity](type-value-based-identity.md) - Compare value-based objects by equality, never identity.

Batches: 1 (err, verified), 2 (type, conc, verified), 3 (api, test, verified), 4 (sec, obs, verified), 5 (perf, io, verified), 6 (mem, doc, verified), 7 (gen, opt), 8 (num, coll), 9 (proj, style), 10 (lint, async), 11 (pat, type, api, conc, ann, data, net, ffi, sec, conv, const, anti, test). Plan complete: all 303 rules authored.
