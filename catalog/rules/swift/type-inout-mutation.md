---
id: swift-type-inout-mutation
lang: swift
prefix: type
title: Use inout only to mutate caller state, not to smuggle out a result
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inout, mutation, return value, side effect]
  files: ["**/*.swift"]
  symbols: [inout]
related: [swift-type-struct-default, swift-type-value-copy]
sources:
  - title: The Swift Programming Language - Memory Safety
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/memorysafety/
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Return a value instead of taking an inout parameter whose only purpose is the result.

## Why

The Swift book explains that a function holds long-term write access to an in-out parameter for the entire call, so reading the same variable during the call produces a conflicting-access error. An inout parameter used as an output slot therefore constrains the caller's surrounding code for no benefit, and the API guidelines say functions without side effects should read as noun phrases. Returning the value keeps the access instantaneous and the signature honest about the computation.

## Bad

```swift
func total(_ values: [Int], into result: inout Int) {
    result = values.reduce(0, +)
}
```

## Good

```swift
func total(_ values: [Int]) -> Int {
    values.reduce(0, +)
}
```

## See Also

- [swift-type-struct-default](type-struct-default.md) - value semantics that make returning cheap
- [swift-type-value-copy](type-value-copy.md) - how the returned value relates to the caller's copy
