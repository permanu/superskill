---
id: swift-anti-nested-ternary
lang: swift
prefix: anti
title: Do not nest the ternary conditional operator
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ternary, nesting, readability]
  files: ["**/*.swift"]
related: [swift-style-if-switch-expression, swift-style-implicit-return]
sources:
  - title: The Swift Programming Language - Basic Operators
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/basicoperators/
---
> Do not combine multiple ternary conditional operators into one statement.

## Why

The Basic Operators chapter warns that the ternary conditional operator's conciseness can lead to hard-to-read code if overused, and instructs authors to avoid combining multiple instances of the operator into one compound statement. A chained ternary hides the decision table in a single expression whose branches are evaluated in a fixed order; the equivalent `if` chain shows each condition and result on its own line.

## Bad

```swift
func grade(for score: Int) -> String {
    let grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "F"
    return grade
}
```

## Good

```swift
func grade(for score: Int) -> String {
    if score >= 90 {
        return "A"
    }
    if score >= 75 {
        return "B"
    }
    if score >= 60 {
        return "C"
    }
    return "F"
}
```

## See Also

- [swift-style-if-switch-expression](style-if-switch-expression.md) - the branch-expression form of the same choices
- [swift-style-implicit-return](style-implicit-return.md) - keeping single expressions readable
