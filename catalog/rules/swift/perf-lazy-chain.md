---
id: swift-perf-lazy-chain
lang: swift
prefix: perf
title: Mark transformation chains lazy to avoid intermediate arrays
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lazy, map, filter, performance]
  files: ["**/*.swift"]
related: [swift-perf-reduce-into, swift-perf-first-where]
sources:
  - title: Array.lazy
    url: https://developer.apple.com/documentation/swift/array/lazy
---
> Mark a transformation chain `lazy` to avoid intermediate arrays.

## Why

Apple documents the `lazy` property as a sequence with the same elements on which operations such as `map` and `filter` are implemented lazily. The eager chain builds a new array at every step before the next step runs; the lazy chain fuses the steps, so no intermediate array is allocated and elements are produced only as the consumer reads them.

## Bad

```swift
let values = [1, 2, 3, 4, 5]
let total = values.map { $0 * 2 }.reduce(0, +)
print(total)
```

## Good

```swift
let values = [1, 2, 3, 4, 5]
let total = values.lazy.map { $0 * 2 }.reduce(0, +)
print(total)
```

## See Also

- [swift-perf-reduce-into](perf-reduce-into.md) - accumulating without copying the result
- [swift-perf-first-where](perf-first-where.md) - stopping at the first match
