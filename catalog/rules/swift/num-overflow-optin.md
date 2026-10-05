---
id: swift-num-overflow-optin
lang: swift
prefix: num
title: Use overflow operators only when wraparound is intended
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overflow, wraparound, arithmetic]
  files: ["**/*.swift"]
related: [swift-num-divisibility, swift-num-decimal-money]
sources:
  - title: The Swift Programming Language - Advanced Operators
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/advancedoperators/
---
> Use the overflow operators only when wraparound is intended.

## Why

The Advanced Operators chapter states that arithmetic operators in Swift do not overflow by default, that overflow behavior is trapped and reported as an error, and that the overflow operators beginning with an ampersand opt in to wraparound arithmetic. A `&+` where the value must stay in range silently turns an out-of-range bug into a wrong result. When overflow is possible and not intended, handle it explicitly with `addingReportingOverflow(_:)` and keep the default trapping operators everywhere else.

## Bad

```swift
var total = Int.max
total = total &+ 1
print(total)
```

## Good

```swift
let total = Int.max
let (sum, overflow) = total.addingReportingOverflow(1)
print(sum, overflow)
```

## See Also

- [swift-num-divisibility](num-divisibility.md) - the safe form of another arithmetic check
- [swift-num-decimal-money](num-decimal-money.md) - arithmetic precision in another domain
