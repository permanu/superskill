---
id: swift-api-tuple-closure-labels
lang: swift
prefix: api
title: Label tuple members and name closure parameters that appear in an API
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tuple, labels, closure parameters, documentation]
  files: ["**/*.swift"]
  symbols: [tuple]
related: [swift-api-argument-labels, swift-api-complexity-doc]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Name tuple members and closure parameters in API signatures so call sites and docs can refer to them.

## Why

The API Design Guidelines' special instructions say to label tuple members and name closure parameters where they appear in an API, because those names have explanatory power, can be referenced from documentation comments, and give expressive access to the members. A return type of `(Bool, Bool)` forces every caller to remember which position means what, and documentation cannot refer to either value by name. Labels move that knowledge into the type.

## Bad

```swift
func split() -> (Bool, Bool) {
    (true, false)
}
```

## Good

```swift
func split() -> (reallocated: Bool, capacityChanged: Bool) {
    (reallocated: true, capacityChanged: false)
}
```

## See Also

- [swift-api-argument-labels](api-argument-labels.md) - the same naming discipline for arguments
- [swift-api-complexity-doc](api-complexity-doc.md) - names that documentation can cite
