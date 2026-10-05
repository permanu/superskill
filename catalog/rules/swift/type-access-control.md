---
id: swift-type-access-control
lang: swift
prefix: type
title: Expose the narrowest access level that satisfies callers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [access control, private, internal, api surface]
  files: ["**/*.swift"]
  symbols: [private, internal, public]
related: [swift-type-final-class, swift-type-struct-default]
sources:
  - title: The Swift Programming Language - Access Control
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/
---
> Mark implementation state private and widen access only where a caller needs it.

## Why

Access control restricts parts of the code from other source files and modules and lets a type specify the interface through which it is used. The Swift book notes that a single-target app may not need explicit access levels at all, and that file-private or private markings are how implementation details stay hidden within the module. Internal mutable state becomes part of every future refactor because any file in the module may depend on it. Narrowing the surface keeps the published interface deliberate.

## Bad

```swift
struct TokenStore {
    var token: String?
    var refreshCount = 0
}
```

## Good

```swift
struct TokenStore {
    private(set) var token: String?
    private var refreshCount = 0

    mutating func store(_ token: String) {
        self.token = token
        refreshCount += 1
    }
}
```

## See Also

- [swift-type-final-class](type-final-class.md) - the same narrowing applied to subclassing
- [swift-type-struct-default](type-struct-default.md) - value types whose copies expose no extra state
