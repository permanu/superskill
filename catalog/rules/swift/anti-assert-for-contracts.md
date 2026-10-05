---
id: swift-anti-assert-for-contracts
lang: swift
prefix: anti
title: Use preconditions for conditions that must hold in production
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assert, precondition, contracts]
  files: ["**/*.swift"]
related: [swift-err-no-fatal-recoverable, swift-anti-nested-ternary]
sources:
  - title: The Swift Programming Language - The Basics
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/
---
> Use preconditions for conditions that must hold in production.

## Why

The Basics chapter states that assertions are checked only in debug builds while preconditions are checked in both debug and production builds, and that in production the condition inside an assertion is not evaluated at all. A contract written with `assert` silently disappears from the shipped binary: invalid input flows past the check that was supposed to stop it. `precondition` keeps the check and documents that violating it is a programmer error.

## Bad

```swift
func withdraw(amount: Int, from balance: inout Int) {
    assert(amount > 0, "amount must be positive")
    balance -= amount
}
```

## Good

```swift
func withdraw(amount: Int, from balance: inout Int) {
    precondition(amount > 0, "amount must be positive")
    balance -= amount
}
```

## See Also

- [swift-err-no-fatal-recoverable](err-no-fatal-recoverable.md) - when the failure is recoverable instead
- [swift-anti-nested-ternary](anti-nested-ternary.md) - another expression that hides its conditions
