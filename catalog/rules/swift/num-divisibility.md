---
id: swift-num-divisibility
lang: swift
prefix: num
title: Test divisibility with isMultiple(of:)
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [multiple, modulo, divisibility]
  files: ["**/*.swift"]
related: [swift-num-overflow-optin, swift-num-nan-check]
sources:
  - title: BinaryInteger.isMultiple(of:)
    url: https://developer.apple.com/documentation/swift/binaryinteger/ismultiple(of:)
---
> Test divisibility with `isMultiple(of:)` instead of the remainder operator.

## Why

Apple documents `isMultiple(of:)` as returning whether a value is a multiple of the given value, and defines the edge cases: `x.isMultiple(of: 0)` is `true` only when `x` is zero, and `T.min.isMultiple(of: -1)` is `true` even though the quotient is not representable. The remainder expression `x % 0` traps instead of answering, and the comparison form obscures what is being asked. The named method states the divisibility test and handles the boundary values.

## Bad

```swift
let value = 42
let isEven = value % 2 == 0
print(isEven)
```

## Good

```swift
let value = 42
let isEven = value.isMultiple(of: 2)
print(isEven)
```

## See Also

- [swift-num-overflow-optin](num-overflow-optin.md) - the other arithmetic operation that can trap
- [swift-num-nan-check](num-nan-check.md) - comparing values that do not compare equal to themselves
