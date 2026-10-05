---
id: swift-conv-renamed
lang: swift
prefix: conv
title: Mark renamed APIs with an available attribute
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [renamed, availability, migration]
  files: ["**/*.swift"]
related: [swift-conv-obsoleted, swift-api-deprecation]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Mark a renamed API so the compiler points callers at the new name.

## Why

The Attributes chapter documents the `renamed` argument as the message that indicates the new name for a declaration that has been renamed, and shows applying `@available` with the `renamed` and `unavailable` arguments to a type alias so that using the old name is a compile-time error that names the replacement. Without it, a renamed API either disappears silently or keeps two names alive, and callers migrate by rumor.

## Bad

```swift
protocol AccountLoading {
    func loadAccount(id: Int) -> String
}
```

## Good

```swift
protocol AccountLoading {
    func loadAccount(id: Int) -> String
}

@available(*, unavailable, renamed: "AccountLoading")
typealias UserLoading = AccountLoading
```

## See Also

- [swift-conv-obsoleted](conv-obsoleted.md) - removing an API that must no longer be called
- [swift-api-deprecation](api-deprecation.md) - the first stage of retiring an API
