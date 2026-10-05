---
id: swift-arc-weak-consumption
lang: swift
prefix: arc
title: Treat a weak reference as optional because it zeroes out on deallocation
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [weak, optional, nil, force unwrap]
  files: ["**/*.swift"]
  symbols: [weak, guard]
related: [swift-arc-weak-cycle, swift-arc-unowned-lifetime]
sources:
  - title: The Swift Programming Language - Automatic Reference Counting
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/
---
> Read a weak reference as an Optional and unwrap it before use.

## Why

The Swift book defines weak references as always optional variables because their value becomes nil when the referenced instance deallocates. That transition can happen between any two statements, so a force unwrap of a weak reference can trap on a path that worked in testing. Binding the weak reference once with `guard let` gives a strong local reference for the duration of the use.

## Bad

```swift
final class Session {
    weak var cache: Cache?

    func store(_ value: String) {
        cache!.store(value)
    }
}

final class Cache {
    func store(_ value: String) {}
}
```

## Good

```swift
final class Session {
    weak var cache: Cache?

    func store(_ value: String) {
        guard let cache else { return }
        cache.store(value)
    }
}

final class Cache {
    func store(_ value: String) {}
}
```

## See Also

- [swift-arc-weak-cycle](arc-weak-cycle.md) - creating the weak side of a relationship
- [swift-arc-unowned-lifetime](arc-unowned-lifetime.md) - when a non-optional reference is justified
