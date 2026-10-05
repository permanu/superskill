---
id: swift-conc-mutex-short-state
lang: swift
prefix: conc
title: Use Mutex for short synchronous critical sections instead of routing them through an actor
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mutex, lock, critical section, synchronous state]
  files: ["**/*.swift"]
  symbols: [Mutex, withLock, actor]
related: [swift-conc-actor-state]
sources:
  - title: Mutex
    url: https://developer.apple.com/documentation/synchronization/mutex
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Guard short synchronous state with `Mutex`; reserve actors for state whose operations are asynchronous.

## Why

`Mutex` offers non-recursive exclusive access to the value it protects, with `withLock` acquiring and releasing around a closure, so a counter or cache can be read synchronously. Actor-isolated state is reachable only through `await`, which cannot appear in synchronous APIs and adds a suspension point to every access. When the protected operation is synchronous and short, the mutex expresses the requirement without turning callers asynchronous.

## Bad

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
```

## Good

```swift
import Synchronization

final class Counter: Sendable {
    private let value = Mutex(0)

    func increment() {
        value.withLock { $0 += 1 }
    }

    func current() -> Int {
        value.withLock { $0 }
    }
}
```

## See Also

- [swift-conc-actor-state](conc-actor-state.md) - when the state belongs in an actor instead
