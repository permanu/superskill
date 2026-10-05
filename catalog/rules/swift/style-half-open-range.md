---
id: swift-style-half-open-range
lang: swift
prefix: style
title: Use half-open ranges for zero-based indexes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [range, index, half-open]
  files: ["**/*.swift"]
  symbols: [Range]
related: [swift-style-for-case, swift-mem-slice-storage]
sources:
  - title: The Swift Programming Language - Basic Operators
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/basicoperators/
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Use half-open ranges for zero-based indexes that stop before the end.

## Why

The Basic Operators chapter states that half-open ranges are particularly useful with zero-based lists such as arrays, where counting runs up to but not including the length of the list, and the Control Flow chapter uses `0..<minutes` to draw one tick per minute. A closed range ending at the last index breaks when the collection is empty, while the half-open range is empty and valid.

## Bad

```swift
let names = ["Anna", "Alex", "Brian", "Jack"]
for i in 0...(names.count - 1) {
    print(names[i])
}
```

## Good

```swift
let names = ["Anna", "Alex", "Brian", "Jack"]
for i in 0..<names.count {
    print(names[i])
}
```

## See Also

- [swift-style-for-case](style-for-case.md) - iterating with patterns instead of indexes
- [swift-mem-slice-storage](mem-slice-storage.md) - index semantics of slices and arrays
