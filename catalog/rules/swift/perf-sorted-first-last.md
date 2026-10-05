---
id: swift-perf-sorted-first-last
lang: swift
prefix: perf
title: Compute the minimum or maximum with min or max instead of sorting
severity: should
enforce: both
tool: swiftlint:sorted_first_last
baseline: latest
status: verified
triggers:
  keywords: [sorted, min, max, performance]
  files: ["**/*.swift"]
related: [swift-perf-last-where, swift-perf-contains-over-filter]
sources:
  - title: SwiftLint - sorted_first_last
    url: https://realm.github.io/SwiftLint/sorted_first_last.html
---
> Compute the minimum or maximum with `min()` or `max()` instead of sorting.

## Why

SwiftLint's opt-in `sorted_first_last` performance rule prefers `min()` or `max()` over `sorted().first` or `sorted().last`. Sorting orders the entire collection to read one element at its edge; `min()` and `max()` make a single pass and keep the extreme value. The same applies when earlier chained transformations feed the sort.

## Bad

```swift
let scores = [72, 91, 85]
let highest = scores.sorted().last
print(highest as Any)
```

## Good

```swift
let scores = [72, 91, 85]
let highest = scores.max()
print(highest as Any)
```

## See Also

- [swift-perf-last-where](perf-last-where.md) - the last match without building the matches
- [swift-perf-contains-over-filter](perf-contains-over-filter.md) - existence checks without filtering
