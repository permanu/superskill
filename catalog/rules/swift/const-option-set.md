---
id: swift-const-option-set
lang: swift
prefix: const
title: Model combinable flags as an OptionSet
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optionset, flags, bitmask]
  files: ["**/*.swift"]
related: [swift-const-enum-raw, swift-num-literal-readability]
sources:
  - title: OptionSet
    url: https://developer.apple.com/documentation/swift/optionset
---
> Model combinable flags as an `OptionSet` instead of loose integers.

## Why

Apple documents `OptionSet` as the protocol for bitset types where individual bits represent members of a set, giving custom types membership tests, unions, and intersections, with no extra work required when the raw value is a fixed-width integer and options are unique powers of two. A namespace of integer constants combines with `|` but has no membership operation and no type boundary, so any integer can be passed where flags are expected. The option set wraps the same bits in a type with the set operations built in.

## Bad

```swift
struct ShippingOptions {
    static let nextDay = 1
    static let secondDay = 2
    static let priority = 4
}

let options = ShippingOptions.nextDay | ShippingOptions.priority
print(options)
```

## Good

```swift
struct ShippingOptions: OptionSet {
    let rawValue: Int

    static let nextDay = ShippingOptions(rawValue: 1 << 0)
    static let secondDay = ShippingOptions(rawValue: 1 << 1)
    static let priority = ShippingOptions(rawValue: 1 << 2)
}

let options: ShippingOptions = [.nextDay, .priority]
print(options.contains(.priority))
```

## See Also

- [swift-const-enum-raw](const-enum-raw.md) - the single-choice counterpart
- [swift-num-literal-readability](num-literal-readability.md) - writing the power-of-two values clearly
