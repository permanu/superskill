---
id: swift-mem-reserve-growth
lang: swift
prefix: mem
title: Do not call reserveCapacity inside a growth loop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reserveCapacity, array, growth, reallocation]
  files: ["**/*.swift"]
  symbols: [reserveCapacity, append]
related: [swift-mem-reserve-known, swift-mem-slice-storage]
sources:
  - title: reserveCapacity(_:)
    url: https://developer.apple.com/documentation/swift/array/reservecapacity(_:)
---
> Let `append` grow the array geometrically; reserve capacity once, not per iteration.

## Why

Apple's documentation for `reserveCapacity` shows the anti-pattern directly: calling it on each pass of a growth loop increases capacity by exactly the requested amount, which is linear growth, and the function can decay to performance linear in the array's count. `append` follows a geometric allocation strategy that gives amortized constant-time appends. The documentation's own fix is to remove the incremental call and let `append` grow the array, or to implement a geometric strategy and pass the computed size once.

## Bad

```swift
struct Series {
    var values: [Int] = [0, 1, 2, 3]

    mutating func addTenQuadratic() {
        let newCount = values.count + 10
        values.reserveCapacity(newCount)
        for n in values.count..<newCount {
            values.append(n)
        }
    }
}
```

## Good

```swift
struct Series {
    var values: [Int] = [0, 1, 2, 3]

    mutating func addTen() {
        let newCount = values.count + 10
        for n in values.count..<newCount {
            values.append(n)
        }
    }
}
```

## See Also

- [swift-mem-reserve-known](mem-reserve-known.md) - the case where reserving once is worthwhile
- [swift-mem-slice-storage](mem-slice-storage.md) - another collection decision that affects allocation
