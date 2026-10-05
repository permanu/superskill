---
id: swift-err-wrap-context
lang: swift
prefix: err
title: Wrap a propagated error with the operation context and keep the underlying cause
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wrapping, context, underlying, cause, rethrow]
  files: ["**/*.swift"]
  symbols: [underlying, catch, throw]
related: [swift-err-error-enum-model, swift-err-catch-rethrow-rest]
sources:
  - title: Swift Evolution SE-0413 - Typed throws
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> When rethrowing a lower-level failure, wrap it with the operation and inputs that failed and keep the cause.

## Why

Replacing an error with a context-free case makes every handler's log line identical for distinguishable failures and loses the data that identifies the failing batch. The typed-throws design shows the accepted substitution pattern: a domain error case carrying the context fields plus an `underlyingError` payload. The outer layer can then render, retry, or escalate using the full cause while still catching a type from its own domain.

## Bad

```swift
struct Record { let id: Int }

enum SyncError: Error {
    case failed
}

struct TransportError: Error {
    let status: Int
}

func upload(_ records: [Record]) throws {
    guard !records.isEmpty else { throw TransportError(status: 400) }
}

func sync(_ records: [Record]) throws {
    do {
        try upload(records)
    } catch {
        throw SyncError.failed
    }
}
```

## Good

```swift
struct Record { let id: Int }

enum SyncError: Error {
    case uploadFailed(recordCount: Int, underlying: any Error)
}

struct TransportError: Error {
    let status: Int
}

func upload(_ records: [Record]) throws {
    guard !records.isEmpty else { throw TransportError(status: 400) }
}

func sync(_ records: [Record]) throws {
    do {
        try upload(records)
    } catch {
        throw SyncError.uploadFailed(recordCount: records.count, underlying: error)
    }
}
```

## See Also

- [swift-err-error-enum-model](err-error-enum-model.md) - the enum whose payload carries the context
- [swift-err-catch-rethrow-rest](err-catch-rethrow-rest.md) - deciding what to catch before wrapping
