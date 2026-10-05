---
id: swift-style-guard-early-exit
lang: swift
prefix: style
title: Use guard for requirements that must hold before the main work
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [guard, early exit, control flow]
  files: ["**/*.swift"]
  symbols: [guard]
related: [swift-err-cancellation-check, swift-style-switch-where]
sources:
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Use `guard` for requirements that must hold before the main work.

## Why

The Control Flow chapter states that using a `guard` statement for requirements improves readability compared to the same check with an `if` statement: the code that is typically executed stays at the top level instead of inside an `else` block, and the code handling a violated requirement sits next to the requirement. Bindings made in a `guard` condition remain available for the rest of the scope, so the success path needs no extra unwrapping.

## Bad

```swift
func greet(person: [String: String]) {
    if let name = person["name"] {
        print("Hello \(name)!")
    } else {
        return
    }
}
```

## Good

```swift
func greet(person: [String: String]) {
    guard let name = person["name"] else {
        return
    }
    print("Hello \(name)!")
}
```

## See Also

- [swift-err-cancellation-check](err-cancellation-check.md) - guard-style early exits at cancellation points
- [swift-style-switch-where](style-switch-where.md) - filtering switch cases with where clauses
