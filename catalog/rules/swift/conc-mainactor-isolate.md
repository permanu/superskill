---
id: swift-conc-mainactor-isolate
lang: swift
prefix: conc
title: Isolate UI-owning types to the main actor instead of leaving their state nonisolated
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [main actor, mainactor, ui state, isolation]
  files: ["**/*.swift"]
  symbols: [MainActor, Actor]
related: [swift-conc-actor-state, swift-conc-detached-task]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: MainActor
    url: https://developer.apple.com/documentation/swift/mainactor
---
> Annotate types that own UI state with `@MainActor` so every access is checked against the main actor.

## Why

The main actor protects the data used to render the interface, and the Swift book shows `@MainActor` on a type propagating isolation to all of its methods and properties. A type without the annotation leaves its state nonisolated, so nothing stops background code from mutating it while the UI reads it. Static isolation on the owner makes the compiler enforce the access rule instead of relying on call-site discipline.

## Bad

```swift
final class FeedModel {
    var items: [String] = []

    func add(_ item: String) {
        items.append(item)
    }

    @MainActor func render() -> String {
        items.joined(separator: "\n")
    }
}
```

## Good

```swift
@MainActor
final class FeedModel {
    private(set) var items: [String] = []

    func add(_ item: String) {
        items.append(item)
    }

    func render() -> String {
        items.joined(separator: "\n")
    }
}
```

## See Also

- [swift-conc-actor-state](conc-actor-state.md) - actors for shared state that is not UI-bound
- [swift-conc-detached-task](conc-detached-task.md) - keeping launched work inside the main actor context
