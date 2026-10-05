---
id: swift-proj-inlinable
lang: swift
prefix: proj
title: Mark a public function inlinable only when its body is small and stable
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inlinable, abi, public api, optimization]
  files: ["**/*.swift"]
  symbols: ["@inlinable"]
related: [swift-proj-frozen, swift-proj-usable-from-inline]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Expose a function's implementation with `@inlinable` only for small, stable bodies.

## Why

The Swift book describes `@inlinable` as exposing a declaration's implementation as part of the module's public interface. The body becomes something clients can compile into their own code, so it is effectively part of the contract: changing it changes behavior clients already built, and it can only reference public or `@usableFromInline` symbols. Large or evolving bodies, such as pricing rules whose rates change, should stay opaque; small arithmetic and forwarding helpers are the appropriate candidates.

## Bad

```swift
@inlinable
public func shippingCost(weight: Double, distance: Double) -> Double {
    let base = 4.99
    let perKilogram = 1.25
    let perKilometer = 0.02
    let fuelSurcharge = 0.08
    let subtotal = base + weight * perKilogram + distance * perKilometer
    return subtotal * (1 + fuelSurcharge)
}
```

## Good

```swift
public func shippingCost(weight: Double, distance: Double) -> Double {
    let base = 4.99
    let perKilogram = 1.25
    let perKilometer = 0.02
    let fuelSurcharge = 0.08
    let subtotal = base + weight * perKilogram + distance * perKilometer
    return subtotal * (1 + fuelSurcharge)
}
```

## See Also

- [swift-proj-frozen](proj-frozen.md) - the same exposure decision for type layout
- [swift-proj-usable-from-inline](proj-usable-from-inline.md) - supporting symbols for the bodies that are inlinable
