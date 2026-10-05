---
id: swift-async-task-sleep
lang: swift
prefix: async
title: Suspend with Task.sleep instead of sleeping the thread
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sleep, delay, async]
  files: ["**/*.swift"]
related: [swift-async-no-blocking, swift-err-cancellation-check]
sources:
  - title: Task.sleep(for:tolerance:clock:)
    url: https://developer.apple.com/documentation/swift/task/sleep(for:tolerance:clock:)
---
> Suspend an async task with `Task.sleep` instead of sleeping the thread.

## Why

Apple documents `Task.sleep(for:tolerance:clock:)` as suspending the current task for the given duration without blocking the underlying thread, and as throwing `CancellationError` if the task is canceled before the time ends. `Thread.sleep` occupies a cooperative-pool thread for the whole duration and ignores cancellation. Swift 6 marks `Thread.sleep` unavailable from asynchronous contexts, but a synchronous helper that sleeps can still be called from async code and shrinks the pool.

## Bad

```swift
import Foundation

func sleepBlocking() {
    Thread.sleep(forTimeInterval: 1)
}

func retryLater() async {
    sleepBlocking()
}
```

## Good

```swift
func retryLater() async {
    try? await Task.sleep(for: .seconds(1))
}
```

## See Also

- [swift-async-no-blocking](async-no-blocking.md) - keeping threads free in async contexts
- [swift-err-cancellation-check](err-cancellation-check.md) - treating cancellation as control flow
