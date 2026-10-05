---
id: swift-conc-actor-state
lang: swift
prefix: conc
title: Protect shared mutable state with an actor instead of unchecked sendability
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [actor, shared state, data race, sendable]
  files: ["**/*.swift"]
  symbols: [actor, unchecked Sendable]
related: [swift-conc-sendable-values, swift-conc-mainactor-isolate]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: Swift Evolution SE-0306 - Actors
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md
  - title: Swift Evolution SE-0302 - Sendable and @Sendable closures
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0302-concurrent-value-and-concurrent-closures.md
---
> Put shared mutable state behind an actor so the compiler serializes access instead of trusting a manual claim.

## Why

An actor protects its mutable state by allowing one task at a time to touch it, and every cross-actor reference is checked at compile time. A class marked `@unchecked Sendable` disables those checks while leaving the underlying race intact: concurrent increments interleave on the same storage and lose updates. SE-0302 states that `@unchecked` indicates a type can safely be passed across concurrency domains but requires the author to ensure that this is safe, and that the conformance is appropriate for classes with internal synchronization; a bare mutable class meets neither condition. Actors express the same sharing guarantee without an unchecked assertion.

## Bad

```swift
final class Counter: @unchecked Sendable {
    private var value = 0

    func increment() {
        value += 1
    }

    func current() -> Int {
        value
    }
}

func hammer(_ counter: Counter) async {
    await withTaskGroup(of: Void.self) { group in
        for _ in 0..<10 {
            group.addTask { counter.increment() }
        }
    }
}
```

## Good

```swift
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func current() -> Int {
        value
    }
}

func hammer(_ counter: Counter) async {
    await withTaskGroup(of: Void.self) { group in
        for _ in 0..<10 {
            group.addTask { await counter.increment() }
        }
    }
}
```

## See Also

- [swift-conc-sendable-values](conc-sendable-values.md) - making the values that cross actors safe to share
- [swift-conc-mainactor-isolate](conc-mainactor-isolate.md) - the global actor that already protects UI state
