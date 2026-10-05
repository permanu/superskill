---
id: swift-perf-empty-check
lang: swift
prefix: perf
title: Test emptiness with isEmpty
severity: should
enforce: both
tool: swiftlint:empty_count
baseline: latest
status: verified
triggers:
  keywords: [isempty, count, performance]
  files: ["**/*.swift"]
related: [swift-perf-contains-over-filter, swift-style-half-open-range]
sources:
  - title: Collection.isEmpty
    url: https://developer.apple.com/documentation/swift/collection/isempty
  - title: SwiftLint - empty_count
    url: https://realm.github.io/SwiftLint/empty_count.html
  - title: SwiftLint - empty_collection_literal
    url: https://realm.github.io/SwiftLint/empty_collection_literal.html
---
> Test emptiness with `isEmpty` instead of `count` or an empty literal.

## Why

Apple documents `isEmpty` as the way to check whether a collection is empty instead of comparing `count` to zero, and notes that for collections that do not conform to `RandomAccessCollection` the `count` property iterates through the elements. SwiftLint's opt-in `empty_count` and `empty_collection_literal` performance rules flag `count == 0` and comparisons to `[]` or `[:]` for the same reason. `isEmpty` is O(1) and states the question directly.

## Bad

```swift
let values = [1, 2, 3]
if values.count == 0 {
    print("empty")
}
```

## Good

```swift
let values = [1, 2, 3]
if values.isEmpty {
    print("empty")
}
```

## See Also

- [swift-perf-contains-over-filter](perf-contains-over-filter.md) - answering membership without materializing matches
- [swift-style-half-open-range](style-half-open-range.md) - collection bounds without off-by-one arithmetic
