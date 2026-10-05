---
id: swift-pat-one-sided-range
lang: swift
prefix: pat
title: Use one-sided ranges for open-ended slices
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [one-sided range, slice, index]
  files: ["**/*.swift"]
related: [swift-style-half-open-range, swift-mem-slice-storage]
sources:
  - title: The Swift Programming Language - Basic Operators
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/basicoperators/
---
> Use a one-sided range for a slice that runs to the end of a collection.

## Why

The Basic Operators chapter documents one-sided ranges: for a range that continues as far as possible in one direction, the value on that side of the operator is omitted, as in `names[2...]`. Writing the end index out instead repeats the collection's bounds arithmetic at every call site and introduces the classic off-by-one. The one-sided range states the intent, and the collection supplies the bound.

## Bad

```swift
let names = ["Anna", "Alex", "Brian"]
let tail = names[2...(names.count - 1)]
print(tail)
```

## Good

```swift
let names = ["Anna", "Alex", "Brian"]
let tail = names[2...]
print(tail)
```

## See Also

- [swift-style-half-open-range](style-half-open-range.md) - ranges that stop before the end
- [swift-mem-slice-storage](mem-slice-storage.md) - the slice a range subscript produces
