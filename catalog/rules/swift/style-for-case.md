---
id: swift-style-for-case
lang: swift
prefix: style
title: Combine loop filtering and binding with for case
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [for case, pattern matching, loop]
  files: ["**/*.swift"]
related: [swift-style-switch-where, swift-style-guard-early-exit]
sources:
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Combine loop filtering and value binding with `for case` instead of a nested `if`.

## Why

The Control Flow chapter presents `for case` as the more concise way to combine value bindings and a condition that would otherwise be written as a `for` loop with an `if` inside it, and the statements in the loop then run only for matching elements. The pattern states the filter where the iteration is set up, and the body keeps a single level of nesting.

## Bad

```swift
let points = [(10, 0), (30, -30), (-20, 0)]
for (x, y) in points {
    if y == 0 {
        print("Found a point on the x-axis at \(x)")
    }
}
```

## Good

```swift
let points = [(10, 0), (30, -30), (-20, 0)]
for case (let x, 0) in points {
    print("Found a point on the x-axis at \(x)")
}
```

## See Also

- [swift-style-switch-where](style-switch-where.md) - additional conditions on switch cases
- [swift-style-guard-early-exit](style-guard-early-exit.md) - the statement form of the same early-exit idea
