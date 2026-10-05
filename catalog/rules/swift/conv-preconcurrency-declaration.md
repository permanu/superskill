---
id: swift-conv-preconcurrency-declaration
lang: swift
prefix: conv
title: Annotate declarations with preconcurrency while clients migrate
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [preconcurrency, declaration, migration]
  files: ["**/*.swift"]
related: [swift-conv-preconcurrency-import, swift-api-deprecation]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
  - title: Swift Evolution SE-0337 - Incremental migration to concurrency checking
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0337-support-incremental-migration-to-concurrency-checking.md
---
> Annotate a declaration with `@preconcurrency` while its clients migrate.

## Why

The Attributes chapter instructs adding the `preconcurrency` attribute when concurrency-related constraints are added to a declaration that still has clients which have not migrated, and removing it after all clients have. SE-0337 explains the mechanism: the attribute adjusts the declaration's type so pre-concurrency clients keep compiling, while clients in a strict context still see the constraints. Without it, adding `@Sendable` or a global actor to an existing API breaks every client that cannot yet prove it satisfies the constraint.

## Bad

```swift
func perform(completion: @Sendable () -> Void) {
    completion()
}
```

## Good

```swift
@preconcurrency
func perform(completion: @Sendable () -> Void) {
    completion()
}
```

## See Also

- [swift-conv-preconcurrency-import](conv-preconcurrency-import.md) - the same attribute on the importing side
- [swift-api-deprecation](api-deprecation.md) - the migration pattern for names instead of effects
