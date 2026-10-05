---
id: swift-err-catch-rethrow-rest
lang: swift
prefix: err
title: Catch only the failures you can resolve and let the rest propagate
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [catch, swallow, propagate, do-catch, handling]
  files: ["**/*.swift"]
  symbols: [do, catch, throw]
related: [swift-err-wrap-context, swift-err-cancellation-not-failure]
sources:
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Catch only the failures you can resolve; let every other error propagate to the surrounding scope.

## Why

A bare catch that ignores every failure discards errors the next layer could act on, so a rejected payload looks identical to an offline device. In Swift, catch clauses that do not match a thrown error pass it outward automatically, and a throwing function can rely on that. Catching the specific conditions you can resolve keeps the function recoverable where recovery exists and honest where it does not.

## Bad

```swift
enum SyncError: Error {
    case offline
    case rejected(payloadID: Int)
}

func upload(_ payloadID: Int) throws {
    throw SyncError.offline
}

func sync(_ payloadID: Int) {
    do {
        try upload(payloadID)
    } catch {
        return
    }
}
```

## Good

```swift
enum SyncError: Error {
    case offline
    case rejected(payloadID: Int)
}

func upload(_ payloadID: Int) throws {
    throw SyncError.offline
}

func sync(_ payloadID: Int) throws {
    do {
        try upload(payloadID)
    } catch SyncError.offline {
        return
    }
}
```

## See Also

- [swift-err-wrap-context](err-wrap-context.md) - adding context when you must rethrow
- [swift-err-cancellation-not-failure](err-cancellation-not-failure.md) - a signal that propagates instead of being reported
