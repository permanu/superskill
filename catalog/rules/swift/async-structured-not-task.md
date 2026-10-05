---
id: swift-async-structured-not-task
lang: swift
prefix: async
title: Await dependent work instead of launching an unstructured task
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [structured concurrency, task, await]
  files: ["**/*.swift"]
related: [swift-async-task-handle, swift-conc-taskgroup-fanout]
sources:
  - title: Swift Evolution SE-0304 - Structured concurrency
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Await dependent work directly instead of launching an unstructured task for it.

## Why

SE-0304 organizes concurrency into parent tasks and child tasks: a function that creates a child task waits for it to end before returning, cancellation propagates down to child tasks, and priority is inherited. An unstructured `Task` has no parent, so the caller returns before the work finishes, cancellation does not reach it, and the Concurrency chapter notes that its correctness is entirely the programmer's responsibility. Await the work when the caller depends on it.

## Bad

```swift
func refreshAndReport() async {
    Task {
        await refresh()
    }
}

func refresh() async {
    try? await Task.sleep(for: .seconds(1))
}
```

## Good

```swift
func refreshAndReport() async {
    await refresh()
}

func refresh() async {
    try? await Task.sleep(for: .seconds(1))
}
```

## See Also

- [swift-async-task-handle](async-task-handle.md) - managing the unstructured tasks you do need
- [swift-conc-taskgroup-fanout](conc-taskgroup-fanout.md) - structured fan-out with task groups
