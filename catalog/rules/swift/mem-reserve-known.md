---
id: swift-mem-reserve-known
lang: swift
prefix: mem
title: Reserve array capacity once when the final count is known
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reserveCapacity, capacity, known count, allocation]
  files: ["**/*.swift"]
  symbols: [reserveCapacity]
related: [swift-mem-reserve-growth]
sources:
  - title: reserveCapacity(_:)
    url: https://developer.apple.com/documentation/swift/array/reservecapacity(_:)
---
> Call `reserveCapacity` once before a loop whose element count is already known.

## Why

The documentation states that if you are adding a known number of elements to an array, `reserveCapacity` avoids multiple reallocations and ensures unique, mutable, contiguous storage with room for at least the requested count. Reserving once up front is the documented use; reserving incrementally inside the loop is the anti-pattern the same page warns about. A single call before a bounded loop removes the reallocation traffic without changing the geometric growth of any later appends.

## Bad

```swift
func collect(_ count: Int) -> [Int] {
    var values: [Int] = []
    for value in 0..<count {
        values.append(value)
    }
    return values
}
```

## Good

```swift
func collect(_ count: Int) -> [Int] {
    var values: [Int] = []
    values.reserveCapacity(count)
    for value in 0..<count {
        values.append(value)
    }
    return values
}
```

## See Also

- [swift-mem-reserve-growth](mem-reserve-growth.md) - why incremental reservations backfire
