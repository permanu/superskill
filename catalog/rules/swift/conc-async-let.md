---
id: swift-conc-async-let
lang: swift
prefix: conc
title: Start independent operations with async let instead of awaiting them in sequence
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async let, parallelism, await, child task]
  files: ["**/*.swift"]
  symbols: [async let, await]
related: [swift-conc-taskgroup-fanout]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: Swift Evolution SE-0304 - Structured concurrency
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md
---
> Launch independent operations with `async let` and await them together when their results are needed.

## Why

Sequential `await` expressions pay the full latency of every operation one after another even when the operations do not depend on each other. `async let` creates a child task for each binding, so the work runs concurrently while remaining bounded by the enclosing scope. The Swift book uses it for cases where the set of tasks is known ahead of time; await the bindings once and the scope cannot exit before they finish.

## Bad

```swift
func loadProfile() async throws -> String {
    let name = try await fetchName()
    let avatar = try await fetchAvatar()
    return "\(name) \(avatar)"
}

func fetchName() async throws -> String { "Ada" }
func fetchAvatar() async throws -> String { "avatar.png" }
```

## Good

```swift
func loadProfile() async throws -> String {
    async let name = fetchName()
    async let avatar = fetchAvatar()
    let (n, a) = try await (name, avatar)
    return "\(n) \(a)"
}

func fetchName() async throws -> String { "Ada" }
func fetchAvatar() async throws -> String { "avatar.png" }
```

## See Also

- [swift-conc-taskgroup-fanout](conc-taskgroup-fanout.md) - the dynamic-count form for unknown numbers of tasks
