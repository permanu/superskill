---
id: swift-const-namespace-enum
lang: swift
prefix: const
title: Host static members on a caseless enum
severity: prefer
enforce: both
tool: swiftlint:convenience_type
baseline: latest
status: verified
triggers:
  keywords: [namespace, static members, enum]
  files: ["**/*.swift"]
related: [swift-const-legacy-constant, swift-type-nested-namespacing]
sources:
  - title: SwiftLint - convenience_type
    url: https://realm.github.io/SwiftLint/convenience_type.html
---
> Host static members on a caseless enum instead of an instantiable type.

## Why

SwiftLint's opt-in `convenience_type` rule states that types used for hosting only static members should be implemented as a caseless enum to avoid instantiation. A struct or class that carries only constants can still be constructed, and each construction produces a meaningless value that the type never meant to support. A caseless enum cannot be instantiated, so the type expresses that it exists only as a namespace.

## Bad

```swift
struct Math {
    static let pi = 3.14
}
```

## Good

```swift
enum Math {
    static let pi = 3.14
}
```

## See Also

- [swift-const-legacy-constant](const-legacy-constant.md) - scoping constants to their type
- [swift-type-nested-namespacing](type-nested-namespacing.md) - nesting supporting types
