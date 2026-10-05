---
id: swift-conc-sendable-values
lang: swift
prefix: conc
title: Make cross-isolation data sendable with immutable value types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sendable, value type, shared data, concurrency domain]
  files: ["**/*.swift"]
  symbols: [Sendable, struct, "@unchecked"]
related: [swift-conc-actor-state, swift-type-value-copy]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: Sendable
    url: https://developer.apple.com/documentation/swift/sendable
---
> Send immutable value types across concurrency domains instead of reference types whose sharing needs unchecked claims.

## Why

A type is sendable when it has no unprotected shared mutable state, and the Swift book lists value types with sendable storage first among the ways to satisfy that. An `@unchecked Sendable` class bypasses the compiler's enforcement while leaving its mutable properties open to concurrent reads and writes. Immutable value types make the guarantee structural: every copy is independent, so nothing can change underneath the receiver.

## Bad

```swift
final class Order: @unchecked Sendable {
    var items: [String] = []

    init(items: [String]) {
        self.items = items
    }
}

actor Kitchen {
    private var orders: [Order] = []

    func accept(_ order: Order) {
        orders.append(order)
    }
}
```

## Good

```swift
struct Order: Sendable {
    let items: [String]
}

actor Kitchen {
    private var orders: [Order] = []

    func accept(_ order: Order) {
        orders.append(order)
    }
}
```

## See Also

- [swift-conc-actor-state](conc-actor-state.md) - the actor that receives these values
- [swift-type-value-copy](type-value-copy.md) - what a value type does and does not copy
