---
id: swift-anti-identical-operands
lang: swift
prefix: anti
title: Do not compare an expression with itself
severity: should
enforce: both
tool: swiftlint:identical_operands
baseline: latest
status: verified
triggers:
  keywords: [identical operands, comparison, typo]
  files: ["**/*.swift"]
related: [swift-anti-force-cast, swift-perf-first-where]
sources:
  - title: SwiftLint - identical_operands
    url: https://realm.github.io/SwiftLint/identical_operands.html
---
> Do not compare an expression with itself.

## Why

SwiftLint's opt-in `identical_operands` rule states that comparing two identical operands is likely a mistake. A comparison such as `a == a` is constant: it is always true for equality, always false for inequality, and never consults the second value the author meant to write. The lint match usually marks a typo or a leftover from a refactor, and reading the two sides side by side is enough to confirm it.

## Bad

```swift
let a = 1
let b = 2
let same = a == a
print(same, b)
```

## Good

```swift
let a = 1
let b = 2
let same = a == b
print(same)
```

## See Also

- [swift-anti-force-cast](anti-force-cast.md) - another expression that traps or lies at runtime
- [swift-perf-first-where](perf-first-where.md) - comparisons over collections that stop early
