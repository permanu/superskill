---
id: swift-mem-lazy-property
lang: swift
prefix: mem
title: Defer expensive property initialization with lazy
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lazy, initialization, deferred, property]
  files: ["**/*.swift"]
  symbols: [lazy]
related: [swift-mem-nscache, swift-type-let-over-var]
sources:
  - title: The Swift Programming Language - Properties
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/properties/
---
> Mark a property lazy when its value is expensive to create and not always needed.

## Why

The Swift book defines a lazy stored property as one whose initial value is not calculated until first use, and presents it for setup that is computationally expensive and should not run unless needed; its example keeps an importer object from being created until the property is queried. Eagerly initializing that object makes every instance pay for a resource many of them never touch. The book also notes that first access from multiple threads is not guaranteed to initialize the property only once, so lazy storage belongs to single-threaded or otherwise synchronized owners.

## Bad

```swift
final class DataManager {
    let importer = DataImporter()
    var data: [String] = []
}

final class DataImporter {
    var filename = "data.txt"
}
```

## Good

```swift
final class DataManager {
    lazy var importer = DataImporter()
    var data: [String] = []
}

final class DataImporter {
    var filename = "data.txt"
}
```

## See Also

- [swift-mem-nscache](mem-nscache.md) - deferring and evicting computed values at cache scope
- [swift-type-let-over-var](type-let-over-var.md) - the mutability tradeoff lazy requires
