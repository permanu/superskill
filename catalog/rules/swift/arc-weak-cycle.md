---
id: swift-arc-weak-cycle
lang: swift
prefix: arc
title: Break strong reference cycles between class instances with a weak reference
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [retain cycle, weak, reference cycle, memory leak]
  files: ["**/*.swift"]
  symbols: [weak, unowned]
related: [swift-arc-closure-capture, swift-arc-weak-consumption]
sources:
  - title: The Swift Programming Language - Automatic Reference Counting
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/
---
> Mark one side of a two-way class relationship weak so the instances can deallocate.

## Why

The Swift book shows that two class instances holding strong references to each other keep both alive forever: neither deinitializer runs, and the memory is leaked. Weak and unowned references let one instance refer to the other without keeping it alive, and the weak side automatically becomes nil when the target deallocates. Making the back-reference weak turns an unbreakable cycle into a one-directional ownership relationship.

## Bad

```swift
final class Person {
    let name: String
    var apartment: Apartment?

    init(name: String) {
        self.name = name
    }
}

final class Apartment {
    let unit: String
    var tenant: Person?

    init(unit: String) {
        self.unit = unit
    }
}
```

## Good

```swift
final class Person {
    let name: String
    var apartment: Apartment?

    init(name: String) {
        self.name = name
    }
}

final class Apartment {
    let unit: String
    weak var tenant: Person?

    init(unit: String) {
        self.unit = unit
    }
}
```

## See Also

- [swift-arc-closure-capture](arc-closure-capture.md) - the same cycle through a stored closure
- [swift-arc-weak-consumption](arc-weak-consumption.md) - reading the weak side safely
