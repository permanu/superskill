---
id: swift-type-enum-state
lang: swift
prefix: type
title: Model mutually exclusive states as enum cases instead of independent flags
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, state, flags, boolean]
  files: ["**/*.swift"]
  symbols: [enum, Bool]
related: [swift-type-enum-associated, swift-type-optional-absence]
sources:
  - title: The Swift Programming Language - Enumerations
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/
---
> Give a mutually exclusive state machine one enum with a case per state.

## Why

Separate booleans can encode states that cannot occur together, and every reader must reconstruct the intended combinations. Swift enumerations define a type-safe group of related values, and switch statements over them must be exhaustive, so a new state cannot be forgotten at a decision point. The enum makes the legal set of states the type, not a convention.

## Bad

```swift
struct Upload {
    var isUploading = false
    var didFail = false

    var statusText: String {
        if didFail { return "failed" }
        if isUploading { return "uploading" }
        return "idle"
    }
}
```

## Good

```swift
enum UploadState {
    case idle
    case uploading
    case failed

    var statusText: String {
        switch self {
        case .idle: "idle"
        case .uploading: "uploading"
        case .failed: "failed"
        }
    }
}
```

## See Also

- [swift-type-enum-associated](type-enum-associated.md) - attaching per-state data to cases
- [swift-type-optional-absence](type-optional-absence.md) - the absence case that is not a state
