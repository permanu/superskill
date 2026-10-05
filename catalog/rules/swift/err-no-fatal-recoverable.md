---
id: swift-err-no-fatal-recoverable
lang: swift
prefix: err
title: Propagate recoverable failures instead of calling fatalError or preconditionFailure
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fatalError, precondition, crash, recoverable, validation]
  files: ["**/*.swift"]
  symbols: [fatalError, preconditionFailure, throws]
related: [swift-err-optional-not-failure, swift-err-error-enum-model]
sources:
  - title: The Swift Programming Language - The Basics
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Propagate recoverable failures as thrown errors; reserve `fatalError` and `preconditionFailure` for invalid program state.

## Why

The Swift book states that assertions and preconditions are not used for recoverable or expected errors, and that recovering from a failed assertion is impossible because the failure signals an invalid program state. A missing config file, malformed JSON, or absent record is invalid input, not invalid state, and the program can validate and respond to it. `fatalError` exists to halt on stubs and unreachable paths; using it on user data converts a handleable error path into a crash.

## Bad

```swift
import Foundation

struct Config {
    let data: Data
}

func loadConfig(at path: String) -> Config {
    guard let data = FileManager.default.contents(atPath: path) else {
        fatalError("config file missing at \(path)")
    }
    return Config(data: data)
}
```

## Good

```swift
import Foundation

struct Config {
    let data: Data
}

enum ConfigError: Error {
    case missing(path: String)
}

func loadConfig(at path: String) throws -> Config {
    guard let data = FileManager.default.contents(atPath: path) else {
        throw ConfigError.missing(path: path)
    }
    return Config(data: data)
}
```

## See Also

- [swift-err-optional-not-failure](err-optional-not-failure.md) - returning the recoverable outcome as an error
- [swift-err-error-enum-model](err-error-enum-model.md) - modeling the recoverable failure set
