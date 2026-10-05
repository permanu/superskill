---
id: swift-err-result-deferred
lang: swift
prefix: err
title: Prefer throws for immediate propagation and reserve Result for stored outcomes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Result, throws, propagation, stored, callback]
  files: ["**/*.swift"]
  symbols: [Result, throws, get]
related: [swift-err-typed-throws, swift-err-optional-not-failure]
sources:
  - title: Swift Evolution SE-0235 - Add Result to the Standard Library
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0235-add-result.md
  - title: Swift Evolution SE-0413 - Typed throws
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md
  - title: Result
    url: https://developer.apple.com/documentation/swift/result
---
> Return throwing functions by default; use `Result` only when the outcome must be stored or cross a non-throwing API.

## Why

The Result proposal targets outcomes that are delayed, stored, or carried through APIs that cannot throw, such as completion handlers. Returned from ordinary synchronous code, `Result` forces a manual switch at every call site and loses `do`-`catch`, `defer`, and `try await` composition; the typed-throws proposal states that `Result` is not the replacement for `throws` in imperative code. Reserve it for the boundaries that genuinely need a value.

## Bad

```swift
enum ParseError: Error {
    case notANumber
}

func parse(_ text: String) -> Result<Int, ParseError> {
    guard let value = Int(text) else { return .failure(.notANumber) }
    return .success(value)
}

func total(_ texts: [String]) -> Result<Int, ParseError> {
    var sum = 0
    for text in texts {
        switch parse(text) {
        case .success(let value):
            sum += value
        case .failure(let error):
            return .failure(error)
        }
    }
    return .success(sum)
}
```

## Good

```swift
import Foundation

enum ParseError: Error { case notANumber }

func parse(_ text: String) throws -> Int {
    guard let value = Int(text) else { throw ParseError.notANumber }
    return value
}

func total(_ texts: [String]) throws -> Int {
    try texts.reduce(0) { $0 + (try parse($1)) }
}

struct ExportJob {
    private(set) var lastRun: Result<URL, any Error>?

    mutating func run() {
        do { lastRun = .success(try export()) } catch { lastRun = .failure(error) }
    }

    func export() throws -> URL { URL(fileURLWithPath: "/tmp/export.zip") }
}
```

## See Also

- [swift-err-typed-throws](err-typed-throws.md) - typing the thrown failure set
- [swift-err-optional-not-failure](err-optional-not-failure.md) - absence versus failure in return types
