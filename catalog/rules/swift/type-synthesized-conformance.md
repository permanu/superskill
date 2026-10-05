---
id: swift-type-synthesized-conformance
lang: swift
prefix: type
title: Let the compiler synthesize Equatable conformance instead of hand-writing equality
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [equatable, synthesis, conformance, equality]
  files: ["**/*.swift"]
  symbols: [Equatable, ==]
related: [swift-type-struct-default, swift-type-value-copy]
sources:
  - title: Swift Evolution SE-0185 - Synthesizing Equatable and Hashable conformance
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0185-synthesize-equatable-hashable.md
---
> Declare the Equatable conformance and let the compiler derive memberwise equality.

## Why

SE-0185 introduced synthesized conformance because hand-written equality is rote, must be updated whenever a property is added or changed, and can be wrong by omission or typo. Declaring the conformance without implementing the requirements makes the compiler derive the memberwise comparison from the stored properties. A manual operator should exist only when equality deliberately differs from memberwise comparison.

## Bad

```swift
struct Point: Equatable {
    var x: Int
    var y: Int

    static func == (lhs: Point, rhs: Point) -> Bool {
        lhs.x == rhs.x && lhs.y == rhs.y
    }
}
```

## Good

```swift
struct Point: Equatable {
    var x: Int
    var y: Int
}
```

## See Also

- [swift-type-struct-default](type-struct-default.md) - value types whose stored properties drive synthesis
- [swift-type-value-copy](type-value-copy.md) - what memberwise equality compares
