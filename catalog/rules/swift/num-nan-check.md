---
id: swift-num-nan-check
lang: swift
prefix: num
title: Test for NaN with isNaN instead of equality
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nan, floating point, comparison]
  files: ["**/*.swift"]
related: [swift-num-decimal-money, swift-num-divisibility]
sources:
  - title: FloatingPoint
    url: https://developer.apple.com/documentation/swift/floatingpoint
---
> Test for NaN with `isNaN` instead of an equality comparison.

## Why

The `FloatingPoint` documentation states that floating-point types represent nonnumeric results as NaN, that comparing a NaN with any value including another NaN results in `false`, and that because of this the `isNaN` property should be used to test whether a value is NaN. A validity check written as `value == value` reads as a tautology, and a NaN test written as `value == .nan` never succeeds.

## Bad

```swift
let value = Double.nan
if value == value {
    print("value is a number")
}
```

## Good

```swift
let value = Double.nan
if !value.isNaN {
    print("value is a number")
}
```

## See Also

- [swift-num-decimal-money](num-decimal-money.md) - arithmetic that binary floating point cannot represent
- [swift-num-divisibility](num-divisibility.md) - naming the numeric question being asked
