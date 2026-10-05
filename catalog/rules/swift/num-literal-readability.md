---
id: swift-num-literal-readability
lang: swift
prefix: num
title: Group digits in long numeric literals
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [numeric literal, underscores, readability]
  files: ["**/*.swift"]
related: [swift-num-overflow-optin, swift-const-legacy-constant]
sources:
  - title: The Swift Programming Language - The Basics
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/
---
> Group digits in long numeric literals with underscores.

## Why

The Basics chapter states that numeric literals can contain underscores to help with readability, and that the underscores do not change the value. A literal such as `1000000` has to be counted digit by digit to be read, and a missing or extra zero is easy to miss in review. Grouping the digits in the same pattern the value is spoken in makes the magnitude visible at a glance.

## Bad

```swift
let budget = 1000000
let nanosecond = 0.000000001
print(budget, nanosecond)
```

## Good

```swift
let budget = 1_000_000
let nanosecond = 0.000_000_001
print(budget, nanosecond)
```

## See Also

- [swift-num-overflow-optin](num-overflow-optin.md) - values that overflow the type's range
- [swift-const-legacy-constant](const-legacy-constant.md) - referring to constants through their type
