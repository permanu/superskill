---
id: swift-conv-preconcurrency-import
lang: swift
prefix: conv
title: Stage concurrency checking with preconcurrency imports
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [preconcurrency, migration, import]
  files: ["**/*.swift"]
related: [swift-conv-preconcurrency-declaration, swift-conc-sendable-values]
sources:
  - title: Swift Evolution SE-0337 - Incremental migration to concurrency checking
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0337-support-incremental-migration-to-concurrency-checking.md
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Stage concurrency checking with `@preconcurrency` imports.

## Why

SE-0337 documents `@preconcurrency import` as the escape hatch for adopting strict concurrency before the modules you import have been audited: Sendable diagnostics caused by types from that module are suppressed or downgraded, and the compiler warns once the attribute no longer has an effect so it can be removed. The Attributes chapter describes the same workflow: enable strict checking, annotate imports of modules that have not enabled it, and remove the attribute after they migrate. The attribute keeps the project compiling without giving up on checking your own code.

## Bad

```swift
import Foundation

@MainActor
final class SessionCache {
    func store(_ response: URLResponse) {
        print(response)
    }
}
```

## Good

```swift
@preconcurrency import Foundation

@MainActor
final class SessionCache {
    func store(_ response: URLResponse) {
        print(response)
    }
}
```

## See Also

- [swift-conv-preconcurrency-declaration](conv-preconcurrency-declaration.md) - the same attribute on your own declarations
- [swift-conc-sendable-values](conc-sendable-values.md) - the conformance the migration is working toward
