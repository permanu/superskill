---
id: swift-arc-exclusive-access
lang: swift
prefix: arc
title: Never pass the same class property to two inout parameters
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inout, exclusivity, overlapping access, runtime trap]
  files: ["**/*.swift"]
  symbols: [inout]
related: [swift-type-inout-mutation, swift-arc-weak-consumption]
sources:
  - title: The Swift Programming Language - Memory Safety
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/memorysafety/
---
> Copy a class property into locals before passing it to more than one `inout` parameter.

## Why

The Swift book states that overlapping accesses to the same memory are a conflict, reported at compile time or runtime, and that the compiler's safe-overlap allowances apply to stored properties of value instances rather than class properties. Two `inout` arguments that resolve to the same class property are two long-term write accesses to one location, so the runtime exclusivity check stops the program. Independent local copies remove the overlap.

## Bad

```swift
final class Counter {
    var value = 10
}

func balance(_ x: inout Int, _ y: inout Int) {
    let sum = x + y
    x = sum / 2
    y = sum - x
}

func run(_ counter: Counter) {
    balance(&counter.value, &counter.value)
}
```

## Good

```swift
final class Counter {
    var value = 10
}

func balance(_ x: inout Int, _ y: inout Int) {
    let sum = x + y
    x = sum / 2
    y = sum - x
}

func run(_ counter: Counter) {
    var first = counter.value
    var second = counter.value
    balance(&first, &second)
    counter.value = first + second
}
```

## See Also

- [swift-type-inout-mutation](type-inout-mutation.md) - deciding whether an inout parameter is needed at all
- [swift-arc-weak-consumption](arc-weak-consumption.md) - another optional access that must be checked before use
