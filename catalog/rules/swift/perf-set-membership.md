---
id: swift-perf-set-membership
lang: swift
prefix: perf
title: Use a Set for repeated membership tests
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [set, membership, performance]
  files: ["**/*.swift"]
related: [swift-perf-dictionary-lookup, swift-perf-contains-over-filter]
sources:
  - title: Set
    url: https://developer.apple.com/documentation/swift/set
---
> Use a Set for repeated membership tests instead of an Array.

## Why

Apple documents that you use a set instead of an array when you need to test efficiently for membership and the order of the elements does not matter. Array membership walks the elements, so checking a list of values against a list of allowed values is the product of the two lengths; the same check against a Set of hashable elements performs one hash lookup per value.

## Bad

```swift
let allowed = ["red", "green", "blue"]
let values = ["red", "purple", "blue"]
let invalid = values.filter { !allowed.contains($0) }
print(invalid)
```

## Good

```swift
let allowed: Set = ["red", "green", "blue"]
let values = ["red", "purple", "blue"]
let invalid = values.filter { !allowed.contains($0) }
print(invalid)
```

## See Also

- [swift-perf-dictionary-lookup](perf-dictionary-lookup.md) - the same choice for keyed values
- [swift-perf-contains-over-filter](perf-contains-over-filter.md) - existence checks that stop at the first match
