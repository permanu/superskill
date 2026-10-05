---
id: swift-api-conversion-init-labels
lang: swift
prefix: api
title: Label narrowing conversions and omit the label for value-preserving ones
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [conversion, initializer, truncating, label]
  files: ["**/*.swift"]
  symbols: [init, truncating]
related: [swift-api-first-argument-label, swift-type-optional-absence]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Omit the first label only when the conversion preserves the value; label it when it narrows.

## Why

The API Design Guidelines direct initializers that perform value-preserving conversions to omit the first argument label, because the source value is the whole meaning of the conversion. For narrowing conversions the guidelines recommend a label that describes the narrowing, such as `truncating`, because information is lost and the call site must show that. The label is the difference between `Int64(x)` and `Int8(truncating: x)`.

## Bad

```swift
struct SmallIndex {
    let value: UInt32

    init(_ source: UInt64) {
        self.value = UInt32(truncatingIfNeeded: source)
    }
}
```

## Good

```swift
struct SmallIndex {
    let value: UInt32

    init(truncating source: UInt64) {
        self.value = UInt32(truncatingIfNeeded: source)
    }
}
```

## See Also

- [swift-api-first-argument-label](api-first-argument-label.md) - the general rule for first arguments
- [swift-type-optional-absence](type-optional-absence.md) - another way conversions lose information
