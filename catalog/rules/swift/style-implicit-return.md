---
id: swift-style-implicit-return
lang: swift
prefix: style
title: Omit return from a single-expression closure
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [closure, return, single expression]
  files: ["**/*.swift"]
related: [swift-style-trailing-closure, swift-style-if-switch-expression]
sources:
  - title: The Swift Programming Language - Closures
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/
---
> Omit `return` from a closure whose body is a single expression.

## Why

The Closures chapter documents that a single-expression closure returns the result of that expression when the `return` keyword is omitted, and that the expected function type makes the result unambiguous. The keyword adds no information when the body is one expression; keeping it also trains the eye to expect multi-statement bodies where the last value is not automatically returned.

## Bad

```swift
let names = ["Anna", "Alex", "Brian"]
let reversed = names.sorted(by: { first, second in return first > second })
```

## Good

```swift
let names = ["Anna", "Alex", "Brian"]
let reversed = names.sorted(by: { first, second in first > second })
```

## See Also

- [swift-style-trailing-closure](style-trailing-closure.md) - moving the closure after the call
- [swift-style-if-switch-expression](style-if-switch-expression.md) - the same omission for switch expressions
