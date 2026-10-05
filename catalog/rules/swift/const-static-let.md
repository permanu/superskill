---
id: swift-const-static-let
lang: swift
prefix: const
title: Declare shared values as immutable static let
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static let, immutability, global]
  files: ["**/*.swift"]
related: [swift-const-namespace-enum, swift-anti-nonisolated-unsafe]
sources:
  - title: Swift Evolution SE-0412 - Strict concurrency for global variables
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0412-strict-concurrency-for-global-variables.md
  - title: The Swift Programming Language - Properties
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/properties/
---
> Declare shared values as immutable `static let` of a sendable type.

## Why

SE-0412 requires every global variable to be either isolated to a global actor or both immutable and `Sendable`, and states that immutable sendable globals can be safely accessed from any context. A value that never changes does not need isolation, so declaring it as a `var` buys nothing and invites mutation from any context. The Properties chapter adds that global constants are computed lazily and initialized only once, so `static let` also covers the lazily built shared value.

## Bad

```swift
@MainActor
enum Defaults {
    static var title = "Untitled"
}
```

## Good

```swift
enum Defaults {
    static let title = "Untitled"
}
```

## See Also

- [swift-const-namespace-enum](const-namespace-enum.md) - the type the constants live on
- [swift-anti-nonisolated-unsafe](anti-nonisolated-unsafe.md) - the unsafe way to keep mutable globals
