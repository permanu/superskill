---
id: swift-type-any-existential
lang: swift
prefix: type
title: Spell existential types with any so type erasure is explicit
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [existential, any, protocol type, boxing]
  files: ["**/*.swift"]
  symbols: [any]
related: [swift-type-opaque-return, swift-type-generic-constraints]
sources:
  - title: Swift Evolution SE-0335 - Introduce existential any
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0335-existential-any.md
  - title: The Swift Programming Language - Opaque and Boxed Protocol Types
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/
---
> Write `any Protocol` for existential types so boxing and dynamic dispatch are visible in the signature.

## Why

SE-0335 introduces `any` because existential types have significant limitations and performance implications that the bare protocol spelling hides; the proposal describes boxing, pointer indirection, and dynamic dispatch that generics avoid. The Swift book calls the same construct a boxed protocol type whose concrete type is unknown until runtime and may change. Spelling `any` makes the cost and the loss of type identity part of the declaration.

## Bad

```swift
protocol Storage {
    func read() -> String
}

func describe(_ storage: Storage) -> String {
    storage.read()
}
```

## Good

```swift
protocol Storage {
    func read() -> String
}

func describe(_ storage: any Storage) -> String {
    storage.read()
}
```

## See Also

- [swift-type-opaque-return](type-opaque-return.md) - the `some` form that keeps type identity
- [swift-type-generic-constraints](type-generic-constraints.md) - replacing an existential with a generic parameter
