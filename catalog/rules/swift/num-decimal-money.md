---
id: swift-num-decimal-money
lang: swift
prefix: num
title: Use Decimal for values that are inherently base-10
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [decimal, money, floating point]
  files: ["**/*.swift"]
related: [swift-num-nan-check, swift-num-overflow-optin]
sources:
  - title: Decimal
    url: https://developer.apple.com/documentation/foundation/decimal
  - title: FloatingPoint
    url: https://developer.apple.com/documentation/swift/floatingpoint
---
> Use `Decimal` for values that are inherently base-10, such as money.

## Why

Apple documents `Decimal` as a structure representing a base-10 number, while the `FloatingPoint` protocol documents that its types are IEEE 754 values whose magnitude is calculated with the type's radix, such as radix 2 for `Double`. A decimal fraction like one tenth is not a sum of negative powers of two, so a binary type stores the nearest representable value and sums of prices drift away from the decimal arithmetic the ledger expects. `Decimal` keeps the arithmetic in base 10.

## Bad

```swift
let price = 0.1 + 0.2
print(price == 0.3)
```

## Good

```swift
import Foundation

let price = Decimal(1) / Decimal(10) + Decimal(2) / Decimal(10)
print(price == Decimal(3) / Decimal(10))
```

## See Also

- [swift-num-nan-check](num-nan-check.md) - the other binary floating-point trap
- [swift-num-overflow-optin](num-overflow-optin.md) - when integer wraparound is intended
