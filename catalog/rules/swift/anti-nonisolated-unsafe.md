---
id: swift-anti-nonisolated-unsafe
lang: swift
prefix: anti
title: Do not mark shared mutable state nonisolated(unsafe)
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nonisolated unsafe, isolation, data race]
  files: ["**/*.swift"]
related: [swift-conc-actor-state, swift-conc-sendable-values]
sources:
  - title: Swift Evolution SE-0412 - Strict concurrency for global variables
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0412-strict-concurrency-for-global-variables.md
---
> Do not mark shared mutable state `nonisolated(unsafe)`.

## Why

SE-0412 requires every global variable to be either isolated to a global actor or both immutable and `Sendable`, and documents `nonisolated(unsafe)` as the attribute that disables that checking. The proposal warns that without a correct synchronization mechanism, exclusivity enforcement and tools such as Thread Sanitizer can still identify failures at runtime. The attribute turns a compile-time error into a runtime data race, so isolate the storage instead.

## Bad

```swift
final class Metrics {
    nonisolated(unsafe) static var counts: [String: Int] = [:]
}
```

## Good

```swift
@MainActor
final class Metrics {
    static var counts: [String: Int] = [:]
}
```

## See Also

- [swift-conc-actor-state](conc-actor-state.md) - the same opt-out applied to a type
- [swift-conc-sendable-values](conc-sendable-values.md) - making cross-isolation data actually sendable
