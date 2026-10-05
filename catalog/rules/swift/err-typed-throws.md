---
id: swift-err-typed-throws
lang: swift
prefix: err
title: Use typed throws when the failure set is closed and callers handle it exhaustively
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [typed throws, throws, exhaustive, catch]
  files: ["**/*.swift"]
  symbols: [throws, any Error, Never]
related: [swift-err-error-enum-model, swift-err-catch-rethrow-rest]
sources:
  - title: Swift Evolution SE-0413 - Typed throws
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Declare typed throws when every failure originates in code you control and callers must handle them all.

## Why

Typed throws preserve the concrete error type through `try`, so `catch` receives the enum directly and exhaustive switches replace casts. The proposal limits the pattern to fixed failure sets: same module or package, pass-through generic code, and constrained environments. Untyped `throws` erases the concrete type and forces `as?` recovery at each handling site, while a library that can later surface dependency errors must keep `any Error`.

## Bad

```swift
enum ParseError: Error { case empty, badCharacter(Character) }

func parseRatings(_ text: String) throws -> [Int] {
    guard !text.isEmpty else { throw ParseError.empty }
    return try text.map { character in
        guard let value = character.wholeNumberValue else {
            throw ParseError.badCharacter(character)
        }
        return value
    }
}

func summary(_ text: String) -> String {
    do {
        let ratings = try parseRatings(text)
        return "\(ratings.count) ratings"
    } catch {
        guard let parseError = error as? ParseError else { return "unknown failure" }
        switch parseError {
        case .empty: return "no data"
        case .badCharacter: return "bad character"
        }
    }
}
```

## Good

```swift
enum ParseError: Error { case empty, badCharacter(Character) }

func parseRatings(_ text: String) throws(ParseError) -> [Int] {
    guard !text.isEmpty else { throw .empty }
    var ratings: [Int] = []
    for character in text {
        guard let value = character.wholeNumberValue else {
            throw .badCharacter(character)
        }
        ratings.append(value)
    }
    return ratings
}

func summary(_ text: String) -> String {
    do {
        let ratings = try parseRatings(text)
        return "\(ratings.count) ratings"
    } catch {
        switch error {
        case .empty: return "no data"
        case .badCharacter: return "bad character"
        }
    }
}
```

## See Also

- [swift-err-error-enum-model](err-error-enum-model.md) - defining the closed failure set this rule perfects
- [swift-err-catch-rethrow-rest](err-catch-rethrow-rest.md) - letting unhandled cases propagate
