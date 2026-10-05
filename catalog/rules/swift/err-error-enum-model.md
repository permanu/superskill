---
id: swift-err-error-enum-model
lang: swift
prefix: err
title: Model each failure domain as an Error enum with associated values instead of string messages
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error type, enum, associated values, cases]
  files: ["**/*.swift"]
  symbols: [Error, enum, switch]
related: [swift-err-typed-throws, swift-err-wrap-context]
sources:
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Model each failure domain as an `Error` enum whose associated values carry the data a handler needs.

## Why

Swift enumerations are suited to modeling related error conditions, and associated values communicate the nature of a failure without parsing. A struct with a `message: String` forces every handler to search prose to decide what happened and cannot be switched exhaustively. An enum gives the compiler a closed case set, gives handlers typed payloads, and makes new cases visible at every decision point.

## Bad

```swift
import Foundation

struct NetworkFailure: Error {
    let message: String
}

func download(_ url: URL) throws -> Data {
    throw NetworkFailure(message: "HTTP 503 for \(url.absoluteString)")
}

func describe(_ failure: NetworkFailure) -> String {
    if failure.message.contains("503") {
        return "Server unavailable"
    }
    return failure.message
}
```

## Good

```swift
import Foundation

enum NetworkFailure: Error {
    case timeout(url: URL)
    case httpStatus(code: Int, url: URL)
    case transport(url: URL, underlying: any Error)
}

func download(_ url: URL) throws -> Data {
    throw NetworkFailure.httpStatus(code: 503, url: url)
}

func describe(_ failure: NetworkFailure) -> String {
    switch failure {
    case .timeout(let url): "Timed out: \(url.absoluteString)"
    case .httpStatus(let code, _): "Server returned \(code)"
    case .transport: "Connection failed"
    }
}
```

## See Also

- [swift-err-typed-throws](err-typed-throws.md) - declaring the enum as the function's thrown type
- [swift-err-wrap-context](err-wrap-context.md) - carrying the underlying cause in a case payload
