---
id: swift-conv-obsoleted
lang: swift
prefix: conv
title: Obsolete APIs that must no longer be called
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [obsoleted, availability, removal]
  files: ["**/*.swift"]
related: [swift-conv-renamed, swift-api-deprecation]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Obsolete an API that must no longer be called.

## Why

The Attributes chapter distinguishes `deprecated`, which produces a warning, from `obsoleted`, which states that the declaration is removed from the platform or language and can no longer be used. Deprecation leaves the call compiling for as long as a caller ignores the warning; after the migration window closes, `obsoleted` turns the same call into an error and stops new uses from being written against the retired API.

## Bad

```swift
@available(*, deprecated, message: "Use fetchAccount(id:)")
func fetchUser(id: Int) -> String { "user-\(id)" }
```

## Good

```swift
@available(swift, obsoleted: 1.0, message: "Use fetchAccount(id:)")
func fetchUser(id: Int) -> String { "user-\(id)" }
```

## See Also

- [swift-conv-renamed](conv-renamed.md) - pointing callers at the replacement name
- [swift-api-deprecation](api-deprecation.md) - announcing the deprecation first
