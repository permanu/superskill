---
id: swift-err-cancellation-not-failure
lang: swift
prefix: err
title: Treat CancellationError as control flow, never as an application failure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cancellation, CancellationError, control flow, handling]
  files: ["**/*.swift"]
  symbols: [CancellationError, catch, Task]
related: [swift-err-cancellation-check, swift-err-catch-rethrow-rest]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: Task.checkCancellation()
    url: https://developer.apple.com/documentation/swift/task/checkcancellation()
---
> Handle `CancellationError` in its own catch clause and stop the work instead of reporting a failure.

## Why

Swift delivers cancellation as `CancellationError`, and the documented responses are to throw it, return nil, or return partial work. Reporting it through the same channel as network and validation failures mislabels a normal control-flow signal as an application error and keeps work running after the user left. A dedicated catch clause separates stopping from failure handling.

## Bad

```swift
func load() async throws {
    try Task.checkCancellation()
}

func report(_ error: any Error) async {}

func refresh() async {
    do {
        try await load()
    } catch {
        await report(error)
    }
}
```

## Good

```swift
func load() async throws {
    try Task.checkCancellation()
}

func report(_ error: any Error) async {}

func refresh() async {
    do {
        try await load()
    } catch is CancellationError {
        return
    } catch {
        await report(error)
    }
}
```

## See Also

- [swift-err-cancellation-check](err-cancellation-check.md) - where the `CancellationError` is raised
- [swift-err-catch-rethrow-rest](err-catch-rethrow-rest.md) - catching specific failures only
