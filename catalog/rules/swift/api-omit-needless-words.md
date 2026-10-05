---
id: swift-api-omit-needless-words
lang: swift
prefix: api
title: Omit words in a name that merely repeat type information
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, brevity, type information, role]
  files: ["**/*.swift"]
  symbols: [argument label]
related: [swift-api-argument-labels, swift-api-case-conventions]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Name a parameter for its role, not for the type that already appears in the signature.

## Why

The API Design Guidelines say to omit needless words, specifically words that merely repeat type information, and to name parameters according to their roles instead. A method like `removePlayerElement(_ player: String)` repeats "Player" and "Element" that the declaration already states, so the call site carries no extra meaning. The shorter role-based name keeps every word salient at the point of use.

## Bad

```swift
struct Roster {
    var players: [String] = []

    mutating func removePlayerElement(_ player: String) {
        players.removeAll { $0 == player }
    }
}
```

## Good

```swift
struct Roster {
    var players: [String] = []

    mutating func remove(_ player: String) {
        players.removeAll { $0 == player }
    }
}
```

## See Also

- [swift-api-argument-labels](api-argument-labels.md) - keeping the labels that do carry meaning
- [swift-api-case-conventions](api-case-conventions.md) - casing conventions for names
