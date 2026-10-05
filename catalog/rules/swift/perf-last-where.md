---
id: swift-perf-last-where
lang: swift
prefix: perf
title: Find the last matching element with last(where:)
severity: should
enforce: both
tool: swiftlint:last_where
baseline: latest
status: verified
triggers:
  keywords: [last where, filter, performance]
  files: ["**/*.swift"]
related: [swift-perf-first-where, swift-perf-sorted-first-last]
sources:
  - title: SwiftLint - last_where
    url: https://realm.github.io/SwiftLint/last_where.html
---
> Find the last matching element with `last(where:)` instead of filtering and taking `.last`.

## Why

SwiftLint's opt-in `last_where` performance rule prefers `.last(where:)` over `.filter { }.last` in collections. Filtering builds the whole array of matches before the last one is taken; `last(where:)` walks the collection once and keeps the latest match without allocating a result array.

## Bad

```swift
let values = [1, 2, 3, 4, 5]
let lastEven = values.filter { $0 % 2 == 0 }.last
print(lastEven as Any)
```

## Good

```swift
let values = [1, 2, 3, 4, 5]
let lastEven = values.last(where: { $0 % 2 == 0 })
print(lastEven as Any)
```

## See Also

- [swift-perf-first-where](perf-first-where.md) - the same rule for the first match
- [swift-perf-sorted-first-last](perf-sorted-first-last.md) - min and max without sorting
