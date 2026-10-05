---
id: swift-perf-flatmap-map-reduce
lang: swift
prefix: perf
title: Flatten nested collections with flatMap
severity: should
enforce: both
tool: swiftlint:flatmap_over_map_reduce
baseline: latest
status: verified
triggers:
  keywords: [flatmap, reduce, performance]
  files: ["**/*.swift"]
related: [swift-perf-reduce-into, swift-perf-lazy-chain]
sources:
  - title: SwiftLint - flatmap_over_map_reduce
    url: https://realm.github.io/SwiftLint/flatmap_over_map_reduce.html
---
> Flatten nested collections with `flatMap` instead of mapping and reducing with `+`.

## Why

SwiftLint's opt-in `flatmap_over_map_reduce` performance rule prefers `flatMap` over `map` followed by `reduce([], +)`. The map-reduce pair builds one array of segments and then repeatedly concatenates arrays into a growing accumulator, copying elements at every step; `flatMap` concatenates the segments in a single pass.

## Bad

```swift
struct Group {
    let items: [Int]
}

let groups = [Group(items: [1, 2]), Group(items: [3])]
let allItems = groups.map { $0.items }.reduce([], +)
print(allItems)
```

## Good

```swift
struct Group {
    let items: [Int]
}

let groups = [Group(items: [1, 2]), Group(items: [3])]
let allItems = groups.flatMap { $0.items }
print(allItems)
```

## See Also

- [swift-perf-reduce-into](perf-reduce-into.md) - accumulating without copying the result
- [swift-perf-lazy-chain](perf-lazy-chain.md) - avoiding intermediate arrays in chains
