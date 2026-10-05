---
id: swift-num-random-range
lang: swift
prefix: num
title: Draw random values from a range instead of modulo arithmetic
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, modulo bias, range]
  files: ["**/*.swift"]
related: [swift-sec-random-unpredictable, swift-num-overflow-optin]
sources:
  - title: Swift Evolution SE-0202 - Random Unification
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0202-random-unification.md
---
> Draw random values from a range instead of modulo arithmetic.

## Why

SE-0202 introduces `Int.random(in:)` and documents why the modulo workaround it replaces is wrong: reducing a wider random value with `%` introduces modulo bias, because the modulo does not distribute the probability evenly across the upper bound. The proposal's API examples state that `random(in:)` does not use modulo bias, and the same methods exist for every fixed-width integer and floating-point type.

## Bad

```swift
let dieRoll = Int.random(in: 0...Int.max) % 6 + 1
print(dieRoll)
```

## Good

```swift
let dieRoll = Int.random(in: 1...6)
print(dieRoll)
```

## See Also

- [swift-sec-random-unpredictable](sec-random-unpredictable.md) - the generator to use for security tokens
- [swift-num-overflow-optin](num-overflow-optin.md) - keeping arithmetic results in range
