---
id: swift-err-optional-not-failure
lang: swift
prefix: err
title: Distinguish expected absence from failure instead of collapsing both into an Optional
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, absence, failure, reason, loading]
  files: ["**/*.swift"]
  symbols: [Optional, Error, throws]
related: [swift-err-error-enum-model, swift-err-try-optional-discard]
sources:
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
  - title: The Swift Programming Language - The Basics
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/
---
> Return an Optional only for expected absence; throw when the caller needs to know why an operation failed.

## Why

Optionals represent the absence of a value, and an operation that fails needs to communicate its cause. A `Profile?` result cannot distinguish a missing file from a corrupt one, so callers cannot choose a recovery path or report why. When the failure reason is actionable, throw a typed `Error` and keep `Optional` for lookups where absence is the normal outcome.

## Bad

```swift
import Foundation

struct Profile { let name: String }

func loadProfile(at path: String) -> Profile? {
    guard let text = try? String(contentsOfFile: path, encoding: .utf8) else { return nil }
    return Profile(name: text.trimmingCharacters(in: .whitespaces))
}

func greeting(for path: String) -> String {
    guard let profile = loadProfile(at: path) else {
        return "No profile configured."
    }
    return "Hello, \(profile.name)"
}
```

## Good

```swift
import Foundation

struct Profile { let name: String }

enum ProfileError: Error {
    case notFound(path: String)
    case unreadable(path: String, underlying: any Error)
}

func loadProfile(at path: String) throws -> Profile {
    let text: String
    do {
        text = try String(contentsOfFile: path, encoding: .utf8)
    } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
        throw ProfileError.notFound(path: path)
    } catch {
        throw ProfileError.unreadable(path: path, underlying: error)
    }
    return Profile(name: text.trimmingCharacters(in: .whitespaces))
}
```

## See Also

- [swift-err-error-enum-model](err-error-enum-model.md) - how to model the thrown failure cases
- [swift-err-try-optional-discard](err-try-optional-discard.md) - the `try?` variant of losing the cause
