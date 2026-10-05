# Verification Report - Swift `err` Batch 1

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-04
- Scope: `catalog/rules/swift/err-*.md` (16 rules; all entered as `status: draft`)
- Toolchain: Apple Swift 6.4 (swiftlang-6.4.0.34.1), arm64-apple-macosx26.0; `swiftc -typecheck` and `swift` script mode
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/swift-verify` (snippets, typecheck outputs, runtime harnesses, fetched sources)

## Method

- Fetched every cited URL (12 distinct: TSPL Error Handling / Concurrency / The Basics, Swift API Design Guidelines, SE-0413, SE-0235, LocalizedError, Logger, Task.checkCancellation(), withTaskCancellationHandler, Handling Cocoa Errors in Swift, Result, SwiftLint `force_try`) and captured the passages backing each claim. TSPL and Apple pages were pulled via their DocC JSON endpoints and converted to text; all human-facing URLs return HTTP 200.
- Extracted both snippets from all 16 rules and ran `swiftc -typecheck` on each of the 32 files: clean under default mode and under `-swift-version 6`.
- Ran 22 runtime harnesses (bounded, `timeout 90`, no network, scratch only) covering defer ordering, catch/rethrow, `try?` collapse, LocalizedError messages, CocoaError catch, Optional-vs-throw, `try!`/`fatalError` traps, typed throws, error wrapping, Result handling, unified logging, and all three cancellation rules with synchronous tasks/handlers. Where observability required it, only the no-op bodies were instrumented (e.g. `start()/stop()` prints); declarations, types, and control flow were kept identical.
- Structural checks: frontmatter fields, id/path match, section order, exactly one `swift` fence per `Bad`/`Good`, ≤25 lines, summary ≤30 words, `related`/See Also resolution, INDEX file-list match, duplicate/near-duplicate scan.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| swift-err-cancellation-check | verified | TSPL Concurrency: "Swift concurrency uses a cooperative cancellation model. Each task checks whether it has been canceled at the appropriate points"; checkCancellation(): "The error is always an instance of CancellationError." Typecheck OK. Run: canceled loop threw `CancellationError` at the checkpoint; the unchecked Bad completed all 100 items after cancel. |
| swift-err-cancellation-handler | verified | withTaskCancellationHandler doc: "the cancellation handler is always and immediately invoked when the task is canceled. For example, even if the operation is running code that never checks for cancellation, a cancellation handler still runs"; "If cancellation occurs while the operation is running, the cancellation handler executes concurrently with the operation." Typecheck OK (incl. `-swift-version 6`). Run: Good's handler fired while the operation was blocked in a semaphore that never checks; Bad's catch-only cleanup fired only after the operation returned. Note: `Synchronization.Atomic` is OS-gated (macOS 15+/iOS 18+); ran on macOS 26. |
| swift-err-cancellation-not-failure | verified | TSPL Concurrency documents the responses: "Throwing an error like CancellationError / Returning nil or an empty collection / Returning the partially completed work." Typecheck OK. Run: dedicated `catch is CancellationError` suppressed the report; the generic catch reported `CancellationError()` as a failure. |
| swift-err-catch-rethrow-rest | verified | TSPL Error Handling: "If none of the catch clauses handle the error, the error propagates to the surrounding scope." Typecheck OK. Run: `offline` handled and returned; `rejected` propagated from the throwing Good; Bad swallowed both. |
| swift-err-defer-cleanup | verified | TSPL Error Handling: `defer` runs "regardless of how execution leaves the current block of code — whether it leaves because an error was thrown or because of a statement such as `return` or `break`". Typecheck OK. Run: instrumented sensor printed START, READ, STOP on the throwing path with `defer`; STOP was absent in the Bad. |
| swift-err-error-enum-model | verified | TSPL Error Handling: "Swift enumerations are particularly well suited to modeling a group of related error conditions, with associated values allowing for additional information about the nature of an error to be communicated." Typecheck OK. Run: exhaustive switch described timeout/status/transport cases; Bad parses `contains("503")`. |
| swift-err-localized-user-message | verified | LocalizedError doc defines `errorDescription`, `failureReason`, `helpAnchor`, `recoverySuggestion` as the localized message channel. Typecheck OK. Run: default description is the case dump `fileMissing("report.pdf")`; Good produced "The file report.pdf could not be found." and `localizedDescription` bridges to it; a plain `Error` fell back to the generic message. |
| swift-err-log-unified | **rejected** | The Why states "`Logger` requires a subsystem and category"; the cited Apple page says "assign an **optional** subsystem and category string" and documents `init()` as "Creates a logger that writes to the default subsystem." The requirement claim is contradicted by the source (the isolation/level/redaction claims are supported; both snippets typecheck and the Good ran). Fix the wording to "accepts a subsystem and category" and re-verify. |
| swift-err-no-fatal-recoverable | verified | TSPL The Basics: "assertions and preconditions aren't used for recoverable or expected errors ... there's no way to catch a failed assertion. Recovering from an invalid state is impossible"; `fatalError` is documented for stubs. Typecheck OK. Run: Bad trapped on a missing file (exit 133); Good threw `ConfigError.missing`. |
| swift-err-no-force-try | verified | SwiftLint `force_try`: "Enabled by default: Yes", severity `error`; TSPL: `try!` is for calls known not to throw, otherwise "you'll get a runtime error". Typecheck OK. Run: Bad trapped (exit 133, "'try!' expression unexpectedly raised an error"); Good propagated a catchable CocoaError. |
| swift-err-ns-catch-typed | verified | Handling Cocoa Errors in Swift contains the exact `catch CocoaError.fileNoSuchFile` listing; TSPL notes NSError interop. Typecheck OK. Run: missing-file `removeItem` yields `NSCocoaErrorDomain` code 4; both the typed catch and the raw domain/code pair match, and the typed form is the documented one. |
| swift-err-optional-not-failure | verified | TSPL The Basics: "error handling allows you to determine the underlying cause of failure"; optionals are "there is a value ... or there isn't a value at all". Typecheck OK. Run: missing file threw `ProfileError.notFound(path:)`; Bad returned nil and lost the cause. |
| swift-err-result-deferred | verified | SE-0235 targets asynchronous/delayed handling and stored outcomes; SE-0413 §"Result is not the go to replacement for throws in imperative languages". Typecheck OK. Run: `throws` composition totals correctly; the stored `Result` field records the last export. |
| swift-err-try-optional-discard | verified | TSPL Error Handling: `try?` converts a thrown error to an optional, "when you want to handle all errors in the same way". Typecheck OK. Run: Bad collapsed missing and corrupt to nil; Good threw `SessionError.missing` vs `.corrupt(underlying:)`. |
| swift-err-typed-throws | verified | SE-0413 "When to use typed throws" lists exactly the three circumstances in the Why (same module/package, pass-through generic code, constrained environments) and warns against single-error temptation. Typecheck OK. Run: exhaustive switch over `ParseError` with no cast produced the expected messages. |
| swift-err-wrap-context | verified | SE-0413 shows the permitted substitution pattern carrying context plus `underlyingError` (`struct MapError<Element> { failedElement; underlyingError }`). Typecheck OK. Run: caught `uploadFailed(recordCount: 0, underlying: TransportError(status: 400))`. |

## Cross-cutting checks

- Sources: all cited URLs resolve (HTTP 200) and back their rules' claims; the single mismatch is documented above (`err-log-unified`).
- Compile: 32/32 snippets pass `swiftc -typecheck` on Swift 6.4, also clean with `-swift-version 6`.
- Behavior: all 22 runtime harnesses matched the claims; crash-expected variants exit 133 (`try!`, `fatalError`), good variants throw catchable errors.
- Formatting: all 16 follow the contract body order; exactly one `swift` fence per `Bad`/`Good`; max snippet 25 lines; summaries ≤30 words; all ids match paths; all `related` ids and `## See Also` links resolve; INDEX file list matches the 16 files.
- Duplicates: none; the overlapping pairs state distinct decisions (`try-optional-discard`/`optional-not-failure`, `no-force-try`/`no-fatal-recoverable`, `catch-rethrow-rest`/`wrap-context`, the three cancellation rules, `error-enum-model`/`typed-throws`).
- Tool ids: `swiftlint:force_try` exists in the official SwiftLint docs (enabled by default, error severity).
- Baseline: literal `latest` in all 16.

## Notes / follow-ups (outside verifier ownership)

- `INDEX.md` still says `Rules: 16 (verified: 0)`; stale after these flips and must be updated by its owner.
- `err-log-unified` stays `draft`; fix the "requires" wording and re-verify.
- Non-blocking: `err-wrap-context`'s substitution pattern is cited from SE-0413's rethrows discussion (where the proposal notes typed throws cannot express that contract); the rule itself uses untyped throws, so the pattern applies as written.
- Non-blocking: `err-cancellation-handler`'s runtime claim and the Good snippet depend on `Synchronization.Atomic` (macOS 15+/iOS 18+); verified on macOS 26, and the docs' back-deployment note for `withTaskCancellationHandler` itself does not gate the handler semantics.

## Counts

- Verified: 15/16
- Rejected: 1 (`swift-err-log-unified`)
- Blockers: fix the `err-log-unified` Why ("Logger requires a subsystem and category" contradicts the cited Apple page, which documents both parameters as optional) and re-verify.
