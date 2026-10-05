---
id: swift-type-opaque-return
lang: swift
prefix: type
title: Return an opaque some type to keep concrete implementation types out of the API
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [opaque type, some, return type, abstraction]
  files: ["**/*.swift"]
  symbols: [some, opaque]
related: [swift-type-protocol-capability, swift-type-any-existential]
sources:
  - title: The Swift Programming Language - Opaque and Boxed Protocol Types
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/
---
> Hide a return value's concrete type behind `some Protocol` when callers need only the interface.

## Why

An opaque return type lets the implementation choose the concrete type while callers depend only on the protocols it supports, as the Swift book describes for a shape factory whose helper types are implementation details. Naming the concrete type in the signature freezes that implementation choice into the API and leaks internal wrapper types to every client. `some` preserves type identity for the compiler while keeping the detail private.

## Bad

```swift
protocol Shape {
    func area() -> Double
}

struct Square: Shape {
    let side: Double
    func area() -> Double { side * side }
}

func makeUnitShape() -> Square {
    Square(side: 1)
}
```

## Good

```swift
protocol Shape {
    func area() -> Double
}

struct Square: Shape {
    let side: Double
    func area() -> Double { side * side }
}

func makeUnitShape() -> some Shape {
    Square(side: 1)
}
```

## See Also

- [swift-type-protocol-capability](type-protocol-capability.md) - naming the protocol that describes the result
- [swift-type-any-existential](type-any-existential.md) - the boxed form for runtime-heterogeneous values
