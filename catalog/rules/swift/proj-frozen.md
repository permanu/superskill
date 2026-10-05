---
id: swift-proj-frozen
lang: swift
prefix: proj
title: Apply frozen only when a public type's layout must stay stable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [frozen, library evolution, layout, abi]
  files: ["**/*.swift"]
  symbols: ["@frozen"]
related: [swift-proj-inlinable, swift-type-struct-default]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Reserve `@frozen` for public types whose layout is part of a deliberate commitment.

## Why

The Swift book documents `@frozen` as restricting the kinds of changes a structure or enumeration can undergo: stored properties and cases cannot be added, removed, or reordered without breaking the frozen layout that clients compiled against. That restriction is only worth paying when layout stability is a requirement, such as ABI-stable library types designed for it. Applying it by default to public data types freezes the model's shape into every release.

## Bad

```swift
@frozen
public struct Point {
    public var x: Int
    public var y: Int
}
```

## Good

```swift
public struct Point {
    public var x: Int
    public var y: Int
}
```

## See Also

- [swift-proj-inlinable](proj-inlinable.md) - the other attribute that exposes implementation to clients
- [swift-type-struct-default](type-struct-default.md) - choosing a value type in the first place
