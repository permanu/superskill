---
id: swift-type-generic-constraints
lang: swift
prefix: type
title: Write one generic function instead of an overload per concrete type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, overload, duplication, constraints]
  files: ["**/*.swift"]
  symbols: [generic, Numeric]
related: [swift-type-protocol-capability, swift-type-any-existential]
sources:
  - title: The Swift Programming Language - Generics
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/
---
> Replace a family of type-specific overloads with one generic function constrained to the capability it needs.

## Why

The Swift book introduces generics as the way to write one implementation that works for multiple types, avoiding the duplicated bodies that appear when the same algorithm is repeated for Int, Double, and Float. Duplicated overloads must be kept in sync by hand and each new type needs another copy. A generic parameter constrained to the protocol that supplies the operations keeps the algorithm in one place and lets the compiler check every instantiation.

## Bad

```swift
func doubled(_ value: Int) -> Int { value * 2 }
func doubled(_ value: Double) -> Double { value * 2 }
func doubled(_ value: Float) -> Float { value * 2 }
```

## Good

```swift
func doubled<T: Numeric>(_ value: T) -> T { value * 2 }
```

## See Also

- [swift-type-protocol-capability](type-protocol-capability.md) - naming the protocol used as the constraint
- [swift-type-any-existential](type-any-existential.md) - what a generic parameter avoids erasing
