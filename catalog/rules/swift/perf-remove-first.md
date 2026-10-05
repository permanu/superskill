---
id: swift-perf-remove-first
lang: swift
prefix: perf
title: Do not drain an array from the front in a loop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [removefirst, queue, performance]
  files: ["**/*.swift"]
related: [swift-perf-set-membership, swift-mem-slice-storage]
sources:
  - title: Array.removeFirst(_:)
    url: https://developer.apple.com/documentation/swift/array/removefirst(_:)
---
> Do not drain an array from the front in a loop.

## Why

Apple documents `Array.removeFirst(_:)` as O(n) in the length of the collection: removing from the front shifts every remaining element, and it also invalidates existing indices. A loop that repeatedly calls it to consume a queue turns linear work into quadratic work. Read the elements through a head index or iterate a slice instead.

## Bad

```swift
var queue = [1, 2, 3, 4, 5]
while !queue.isEmpty {
    let next = queue.removeFirst()
    print(next)
}
```

## Good

```swift
let queue = [1, 2, 3, 4, 5]
var head = 0
while head < queue.count {
    let next = queue[head]
    print(next)
    head += 1
}
```

## See Also

- [swift-perf-set-membership](perf-set-membership.md) - choosing a structure that fits the access pattern
- [swift-mem-slice-storage](mem-slice-storage.md) - index semantics of slices and arrays
