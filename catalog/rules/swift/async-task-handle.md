---
id: swift-async-task-handle
lang: swift
prefix: async
title: Keep the handle of an unstructured task that must be cancellable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task, handle, cancellation]
  files: ["**/*.swift"]
related: [swift-async-structured-not-task, swift-conc-detached-task]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Keep the handle of an unstructured task so the work can be waited on or cancelled.

## Why

The Concurrency chapter states that creating an unstructured task returns a task that you can interact with, for example to wait for its result or to cancel it, and that you are completely responsible for the correctness of unstructured tasks. A task reference that is discarded cannot be cancelled, so work that outlives its trigger keeps running with no way to stop it when the screen closes or the operation is replaced.

## Bad

```swift
@MainActor
final class RefreshController {
    func startRefresh() {
        Task {
            await refresh()
        }
    }

    func refresh() async {
        try? await Task.sleep(for: .seconds(5))
    }
}
```

## Good

```swift
@MainActor
final class RefreshController {
    private var refreshTask: Task<Void, Never>?

    func startRefresh() {
        refreshTask?.cancel()
        refreshTask = Task {
            await refresh()
        }
    }

    func stopRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    func refresh() async {
        try? await Task.sleep(for: .seconds(5))
    }
}
```

## See Also

- [swift-async-structured-not-task](async-structured-not-task.md) - when to avoid the unstructured task entirely
- [swift-conc-detached-task](conc-detached-task.md) - preferring Task over Task.detached
