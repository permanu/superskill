---
id: swift-perf-first-where
lang: swift
prefix: perf
title: Find the first matching element with first(where:)
severity: should
enforce: both
tool: swiftlint:first_where
baseline: latest
status: verified
triggers:
  keywords: [first where, filter, performance]
  files: ["**/*.swift"]
related: [swift-perf-last-where, swift-perf-contains-over-filter]
sources:
  - title: SwiftLint - first_where
    url: https://realm.github.io/SwiftLint/first_where.html
---
> Find the first matching element with `first(where:)` instead of filtering and taking `.first`.

## Why

SwiftLint's opt-in `first_where` performance rule prefers `.first(where:)` over `.filter { }.first` in collections. Filtering walks the whole collection and builds a new array before the first element is taken; `first(where:)` stops at the first match and allocates nothing. The same holds when the filter is fed by earlier chained transformations.

## Bad

```swift
let values = [1, 2, 3, 4, 5]
let firstEven = values.filter { $0 % 2 == 0 }.first
print(firstEven as Any)
```

## Good

```swift
let values = [1, 2, 3, 4, 5]
let firstEven = values.first(where: { $0 % 2 == 0 })
print(firstEven as Any)
```

## See Also

- [swift-perf-last-where](perf-last-where.md) - the same rule for the last match
- [swift-perf-contains-over-filter](perf-contains-over-filter.md) - existence checks without filtering
