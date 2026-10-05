---
id: swift-pat-if-case
lang: swift
prefix: pat
title: Match a single pattern with if case
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [if case, pattern matching, switch]
  files: ["**/*.swift"]
related: [swift-style-switch-where, swift-pat-fallthrough]
sources:
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Match a single pattern with `if case` instead of a one-case switch.

## Why

The Control Flow chapter documents `if case` as using a pattern as the condition of an `if` statement, with the same patterns that a switch case accepts, and notes that the statements run when the pattern matches. A switch over a single pattern needs a `default` clause or an explicit `break` to satisfy exhaustiveness, and the extra case hides which pattern is actually being tested. The `if case` form states the one match directly.

## Bad

```swift
enum Direction {
    case north, south
}

let direction = Direction.north
switch direction {
case .north:
    print("heading north")
default:
    break
}
```

## Good

```swift
enum Direction {
    case north, south
}

let direction = Direction.north
if case .north = direction {
    print("heading north")
}
```

## See Also

- [swift-style-switch-where](style-switch-where.md) - conditions inside a full switch
- [swift-pat-fallthrough](pat-fallthrough.md) - cases that run into each other
