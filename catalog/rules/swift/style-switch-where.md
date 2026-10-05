---
id: swift-style-switch-where
lang: swift
prefix: style
title: Filter switch cases with a where clause
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, where, pattern matching]
  files: ["**/*.swift"]
  symbols: [switch]
related: [swift-style-for-case, swift-style-switch-no-default]
sources:
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Filter switch cases with a `where` clause instead of conditions inside the case body.

## Why

The Control Flow chapter documents that a `switch` case can use a `where` clause to check for additional conditions, and that the case matches only when the clause evaluates to true for the matched value. The condition belongs to the pattern: putting it in the `where` clause lets case order express the priority of the conditions, and each body stays a single action instead of an `if` that re-tests the bound values.

## Bad

```swift
func describe(_ point: (x: Int, y: Int)) -> String {
    switch point {
    case let (x, y):
        if x == y {
            return "(\(x), \(y)) is on the line x == y"
        }
        return "(\(x), \(y)) is just some arbitrary point"
    }
}
```

## Good

```swift
func describe(_ point: (x: Int, y: Int)) -> String {
    switch point {
    case let (x, y) where x == y:
        return "(\(x), \(y)) is on the line x == y"
    case let (x, y):
        return "(\(x), \(y)) is just some arbitrary point"
    }
}
```

## See Also

- [swift-style-for-case](style-for-case.md) - the same filtering idea in for loops
- [swift-style-switch-no-default](style-switch-no-default.md) - keeping switches exhaustive without default
