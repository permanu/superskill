---
id: swift-async-no-blocking
lang: swift
prefix: async
title: Do not block an async context waiting for scheduled work
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, blocking, semaphore, thread]
  files: ["**/*.swift"]
related: [swift-async-task-sleep, swift-conc-mutex-short-state]
sources:
  - title: Swift Evolution SE-0296 - Async/await
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0296-async-await.md
---
> Do not block an async context waiting for work that needs the thread pool.

## Why

SE-0296 states that asynchronous functions should avoid calling functions that can block the thread, especially when they block waiting for work that is not guaranteed to be running, and that waiting on a condition variable to be signaled by other scheduled work goes strongly against the recommendation. The cooperative thread pool has a fixed width, so a blocked thread cannot run other tasks and the pool can stall. Swift 6 marks primitives such as `DispatchSemaphore.wait` unavailable from asynchronous contexts, but a synchronous helper that blocks can still be called from async code and stalls the pool the same way.

## Bad

```swift
import Foundation

func waitForReadyBlocking() {
    DispatchSemaphore(value: 0).wait()
}

func waitForReady() async {
    waitForReadyBlocking()
}
```

## Good

```swift
func waitForReady(ready: Task<Void, Never>) async {
    await ready.value
}
```

## See Also

- [swift-async-task-sleep](async-task-sleep.md) - suspending instead of sleeping on the thread
- [swift-conc-mutex-short-state](conc-mutex-short-state.md) - short synchronous critical sections
