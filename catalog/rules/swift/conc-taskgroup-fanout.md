---
id: swift-conc-taskgroup-fanout
lang: swift
prefix: conc
title: Use structured task groups for dynamic fan-out instead of detached tasks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task group, fan-out, structured concurrency, detached]
  files: ["**/*.swift"]
  symbols: [withTaskGroup, Task.detached]
related: [swift-conc-async-let, swift-conc-detached-task]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: Swift Evolution SE-0304 - Structured concurrency
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md
---
> Fan out dynamic work with a task group so children inherit priority and cancel with their parent.

## Why

A task group defines a scope whose child tasks must complete before it returns, and the Swift book lists the payoff: parents cannot forget to wait, priority escalates through the hierarchy, and cancelling the parent cancels the children. A list of detached tasks has none of that relationship; each one starts with no parent context and keeps running after the fan-out site moves on. The structured form makes the lifetime of the parallel work part of the function's contract.

## Bad

```swift
func fetchAll(_ ids: [Int]) async -> [String] {
    let tasks = ids.map { id in
        Task.detached { "item-\(id)" }
    }
    var results: [String] = []
    for task in tasks {
        results.append(await task.value)
    }
    return results
}
```

## Good

```swift
func fetchAll(_ ids: [Int]) async -> [String] {
    await withTaskGroup(of: String.self) { group in
        for id in ids {
            group.addTask { "item-\(id)" }
        }
        var results: [String] = []
        for await item in group {
            results.append(item)
        }
        return results
    }
}
```

## See Also

- [swift-conc-async-let](conc-async-let.md) - the fixed-arity form of the same structured pattern
- [swift-conc-detached-task](conc-detached-task.md) - why detached tasks lose the parent relationship
