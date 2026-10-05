---
id: swift-mem-slice-storage
lang: swift
prefix: mem
title: Convert an ArraySlice to Array before storing it long-term
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [arrayslice, slice, storage, lifetime]
  files: ["**/*.swift"]
  symbols: [ArraySlice, Array]
related: [swift-mem-substring-storage, swift-mem-reserve-known]
sources:
  - title: ArraySlice
    url: https://developer.apple.com/documentation/swift/arrayslice
---
> Return or store an `Array` copy when a slice must outlive the array it views.

## Why

Apple's ArraySlice documentation warns that long-term storage of slices is discouraged because a slice holds a reference to the entire storage of the larger array, even after the original array's lifetime ends; keeping one can therefore prolong the lifetime of elements that are no longer otherwise accessible, which appears as memory and object leakage. The same page also notes slices keep the parent's indices rather than starting at zero. Converting with the `Array` initializer gives a standalone value with its own storage.

## Bad

```swift
func recent(_ values: [Int]) -> ArraySlice<Int> {
    values.suffix(3)
}
```

## Good

```swift
func recent(_ values: [Int]) -> [Int] {
    Array(values.suffix(3))
}
```

## See Also

- [swift-mem-substring-storage](mem-substring-storage.md) - the string form of the same hazard
- [swift-mem-reserve-known](mem-reserve-known.md) - sizing the copy the conversion makes
