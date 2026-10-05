---
id: swift-style-if-switch-expression
lang: swift
prefix: style
title: Return values directly from if and switch expressions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [if expression, switch expression, return]
  files: ["**/*.swift"]
related: [swift-style-implicit-return, swift-type-let-over-var]
sources:
  - title: Swift Evolution SE-0380 - if and switch expressions
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0380-if-switch-expressions.md
---
> Return values directly from `if` and `switch` expressions instead of a `return` in every branch.

## Why

SE-0380 introduced `if` and `switch` expressions for returning values from functions, properties, and closures, assigning values to variables, and declaring variables, with each branch a single expression. The older form repeats the `return` or assignment in every branch; the expression form keeps the value and the branching in one construct and drops the ceremony.

## Bad

```swift
func width(_ value: UInt32) -> Int {
    switch value {
    case 0..<0x80:
        return 1
    case 0x80..<0x800:
        return 2
    default:
        return 4
    }
}
```

## Good

```swift
func width(_ value: UInt32) -> Int {
    switch value {
    case 0..<0x80: 1
    case 0x80..<0x800: 2
    default: 4
    }
}
```

## See Also

- [swift-style-implicit-return](style-implicit-return.md) - the same omission in single-expression closures
- [swift-type-let-over-var](type-let-over-var.md) - declaring the result with let
