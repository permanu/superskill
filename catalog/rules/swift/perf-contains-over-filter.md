---
id: swift-perf-contains-over-filter
lang: swift
prefix: perf
title: Test for a matching element with contains instead of filtering
severity: should
enforce: both
tool: swiftlint:contains_over_filter_count
baseline: latest
status: verified
triggers:
  keywords: [contains, filter, performance]
  files: ["**/*.swift"]
related: [swift-perf-first-where, swift-perf-sorted-first-last]
sources:
  - title: SwiftLint - contains_over_filter_count
    url: https://realm.github.io/SwiftLint/contains_over_filter_count.html
  - title: SwiftLint - contains_over_filter_is_empty
    url: https://realm.github.io/SwiftLint/contains_over_filter_is_empty.html
---
> Test for a matching element with `contains` instead of filtering and counting.

## Why

SwiftLint's opt-in `contains_over_filter_count` and `contains_over_filter_is_empty` performance rules prefer `contains` over comparing `filter { }.count` to zero or checking `filter { }.isEmpty`. A filter builds the whole matching array to answer a yes-or-no question; `contains(where:)` stops at the first match, and `contains(_:)` uses the element's equality directly.

## Bad

```swift
let values = [1, 2, 3, 4, 5]
let hasEven = values.filter { $0 % 2 == 0 }.count > 0
print(hasEven)
```

## Good

```swift
let values = [1, 2, 3, 4, 5]
let hasEven = values.contains(where: { $0 % 2 == 0 })
print(hasEven)
```

## See Also

- [swift-perf-first-where](perf-first-where.md) - locating the match when the value is needed
- [swift-perf-sorted-first-last](perf-sorted-first-last.md) - min and max without sorting
