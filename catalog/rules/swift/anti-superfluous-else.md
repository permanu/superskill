---
id: swift-anti-superfluous-else
lang: swift
prefix: anti
title: Drop else when the if branch exits the scope
severity: prefer
enforce: both
tool: swiftlint:superfluous_else
baseline: latest
status: verified
triggers:
  keywords: [else, return, control flow]
  files: ["**/*.swift"]
related: [swift-style-guard-early-exit, swift-style-switch-where]
sources:
  - title: SwiftLint - superfluous_else
    url: https://realm.github.io/SwiftLint/superfluous_else.html
---
> Drop `else` when the `if` branch exits the current scope.

## Why

SwiftLint's opt-in `superfluous_else` rule states that else branches should be avoided when the previous if-block exits the current scope. When the `if` branch returns, throws, breaks, or continues, the `else` is never needed for correctness: the code after the statement already runs only when the condition failed. Removing it flattens the function and keeps each guard clause's exit next to its condition.

## Bad

```swift
func label(for score: Int) -> String {
    if score >= 60 {
        return "pass"
    } else {
        return "fail"
    }
}
```

## Good

```swift
func label(for score: Int) -> String {
    if score >= 60 {
        return "pass"
    }
    return "fail"
}
```

## See Also

- [swift-style-guard-early-exit](style-guard-early-exit.md) - the guard form of the same early exit
- [swift-style-switch-where](style-switch-where.md) - keeping branch bodies to a single action
