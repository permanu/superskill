---
id: swift-style-switch-no-default
lang: swift
prefix: style
title: Omit default in switches over enumerations
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, enum, default]
  files: ["**/*.swift"]
  symbols: [default]
related: [swift-type-enum-state, swift-style-switch-where]
sources:
  - title: The Swift Programming Language - Enumerations
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/
---
> Omit `default` in switches over enumerations so new cases fail compilation.

## Why

The Enumerations chapter states that a switch over an enumeration must be exhaustive and that requiring exhaustiveness ensures enumeration cases are not accidentally omitted. A `default` clause opts out of that check: when a case is added to the enumeration, the switch keeps compiling and routes the new case through the fallback. Listing every case makes the compiler point at each switch that needs updating.

## Bad

```swift
enum Direction {
    case north, south, east, west
}

func symbol(for direction: Direction) -> String {
    switch direction {
    case .north:
        return "↑"
    default:
        return "→"
    }
}
```

## Good

```swift
enum Direction {
    case north, south, east, west
}

func symbol(for direction: Direction) -> String {
    switch direction {
    case .north:
        return "↑"
    case .south:
        return "↓"
    case .east:
        return "→"
    case .west:
        return "←"
    }
}
```

## See Also

- [swift-type-enum-state](type-enum-state.md) - modeling states as enum cases
- [swift-style-switch-where](style-switch-where.md) - filtering cases with where clauses
