---
id: swift-proj-usable-from-inline
lang: swift
prefix: proj
title: Mark internal symbols referenced by inlinable code usableFromInline
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [usableFromInline, inlinable, internal, abi]
  files: ["**/*.swift"]
  symbols: ["@usableFromInline"]
related: [swift-proj-inlinable, swift-proj-frozen]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Give an internal symbol `@usableFromInline` instead of widening it to public for inlinable callers.

## Why

Inlinable code can only reference symbols that clients can also see, and the book documents `@usableFromInline` as the attribute that makes an internal declaration available to inlinable code without publishing it as public API. Promoting the symbol to `public` works for the compiler but exposes it in the module's interface and commits to maintaining it. `@usableFromInline` keeps the symbol internal to the source surface while making it visible where the inlined body needs it.

## Bad

```swift
public let prefix = "app"

@inlinable
public func label() -> String {
    prefix + "label"
}
```

## Good

```swift
@usableFromInline
internal let prefix = "app"

@inlinable
public func label() -> String {
    prefix + "label"
}
```

## See Also

- [swift-proj-inlinable](proj-inlinable.md) - deciding which bodies to expose
- [swift-proj-frozen](proj-frozen.md) - the type-level equivalent of an exposure commitment
