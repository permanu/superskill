---
id: swift-err-cancellation-check
lang: swift
prefix: err
title: Check for cancellation at loop and suspension boundaries
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cancellation, checkCancellation, task, loop]
  files: ["**/*.swift"]
  symbols: [Task.checkCancellation, CancellationError]
related: [swift-err-cancellation-not-failure, swift-err-cancellation-handler]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: Task.checkCancellation()
    url: https://developer.apple.com/documentation/swift/task/checkcancellation()
---
> Check cancellation with `Task.checkCancellation()` at loop and suspension boundaries.

## Why

Swift concurrency uses cooperative cancellation: a canceled task keeps running until it checks for cancellation. A loop of awaited calls that never checks runs to completion after the caller has navigated away, wasting network, battery, and user time. `Task.checkCancellation()` throws `CancellationError` at the checkpoint, so the task stops and the error unwinds through the structured hierarchy.

## Bad

```swift
func downloadAll(_ ids: [Int]) async -> [String] {
    var results: [String] = []
    for id in ids {
        results.append(await fetch(id))
    }
    return results
}

func fetch(_ id: Int) async -> String { "photo-\(id)" }
```

## Good

```swift
func downloadAll(_ ids: [Int]) async throws -> [String] {
    var results: [String] = []
    for id in ids {
        try Task.checkCancellation()
        results.append(await fetch(id))
    }
    return results
}

func fetch(_ id: Int) async -> String { "photo-\(id)" }
```

## See Also

- [swift-err-cancellation-not-failure](err-cancellation-not-failure.md) - how handlers classify the thrown `CancellationError`
- [swift-err-cancellation-handler](err-cancellation-handler.md) - cleanup that cannot wait for the next checkpoint
