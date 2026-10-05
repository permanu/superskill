---
id: swift-api-boolean-assertions
lang: swift
prefix: api
title: Name Boolean members as assertions about the receiver
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [boolean, naming, property, assertion]
  files: ["**/*.swift"]
  symbols: [Bool]
related: [swift-api-side-effect-naming, swift-api-prefer-methods]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Name a Boolean query so that the use site reads as a statement about the receiver.

## Why

The API Design Guidelines require uses of Boolean methods and properties to read as assertions about the receiver, with `isEmpty` as the canonical example. A method named `checkEmpty()` reads as a command and leaves the result type to be discovered, while `isEmpty` reads as the fact it tests. The property form also drops a call when the value is derived from stored state.

## Bad

```swift
struct Grid {
    var rows: [[Int]] = []

    func checkEmpty() -> Bool {
        rows.isEmpty
    }
}
```

## Good

```swift
struct Grid {
    var rows: [[Int]] = []

    var isEmpty: Bool {
        rows.isEmpty
    }
}
```

## See Also

- [swift-api-side-effect-naming](api-side-effect-naming.md) - verbs for side effects, nouns for queries
- [swift-api-prefer-methods](api-prefer-methods.md) - keeping behavior on the type
