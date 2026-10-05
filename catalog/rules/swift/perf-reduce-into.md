---
id: swift-perf-reduce-into
lang: swift
prefix: perf
title: Accumulate into a copy-on-write result with reduce(into:)
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reduce, accumulator, performance]
  files: ["**/*.swift"]
related: [swift-perf-flatmap-map-reduce, swift-perf-lazy-chain]
sources:
  - title: Array.reduce(into:_:)
    url: https://developer.apple.com/documentation/swift/array/reduce(into:_:)
---
> Accumulate into an array or dictionary with `reduce(into:)` instead of `reduce(_:_:)`.

## Why

Apple documents `reduce(into:_:)` as preferred over `reduce(_:_:)` for efficiency when the result is a copy-on-write type such as an Array or a Dictionary: the closure receives the accumulator `inout` and mutates it in place, while the two-argument form passes and returns the accumulator by value at every step, copying the storage each time.

## Bad

```swift
let words = ["apple", "banana", "avocado"]
let byLetter = words.reduce([Character: [String]]()) { result, word in
    var result = result
    result[word.first ?? "-", default: []].append(word)
    return result
}
print(byLetter)
```

## Good

```swift
let words = ["apple", "banana", "avocado"]
let byLetter = words.reduce(into: [Character: [String]]()) { result, word in
    result[word.first ?? "-", default: []].append(word)
}
print(byLetter)
```

## See Also

- [swift-perf-flatmap-map-reduce](perf-flatmap-map-reduce.md) - building one array from many segments
- [swift-perf-lazy-chain](perf-lazy-chain.md) - avoiding intermediate collections in chains
