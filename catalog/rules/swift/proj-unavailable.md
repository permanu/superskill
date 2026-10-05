---
id: swift-proj-unavailable
lang: swift
prefix: proj
title: Mark an API unavailable when calling it is always wrong
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unavailable, available, api surface, initializer]
  files: ["**/*.swift"]
  symbols: ["@available"]
related: [swift-proj-frozen, swift-proj-inlinable]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Use an unavailable attribute to remove a declaration from the API surface callers can reach.

## Why

The Swift book documents the `unavailable` argument of the `available` attribute as marking a declaration unavailable, with an optional message explaining the replacement. A member that exists only for compiler or implementation reasons, such as a public initializer that bypasses a factory's invariants, otherwise stays callable forever. Making it unavailable turns misuse into a compile-time diagnostic at the call site instead of a runtime surprise.

## Bad

```swift
struct Token {
    init() {}
}
```

## Good

```swift
struct Token {
    @available(*, unavailable, message: "Use makeToken() instead.")
    init() {}

    static func makeToken() -> Token {
        Token(value: "x")
    }

    private let value: String
    private init(value: String) {
        self.value = value
    }
}
```

## See Also

- [swift-proj-frozen](proj-frozen.md) - the other attribute that fixes an API's shape
- [swift-proj-inlinable](proj-inlinable.md) - choosing what clients may compile against
