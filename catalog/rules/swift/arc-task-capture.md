---
id: swift-arc-task-capture
lang: swift
prefix: arc
title: Capture self weakly in a task that outlives the current call
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task, weak self, lifetime, capture]
  files: ["**/*.swift"]
  symbols: [Task, weak]
related: [swift-arc-closure-capture, swift-conc-detached-task]
sources:
  - title: The Swift Programming Language - Automatic Reference Counting
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Capture `self` weakly in an unstructured task whose work should not extend the owner's lifetime.

## Why

A closure that captures an instance strongly keeps it alive, and the Swift book treats closure captures as one of the ways objects are retained past their last external reference. An unstructured task runs concurrently and is not bounded by the calling scope, so a strong capture keeps the owner alive until the task finishes, even if nothing else refers to it. A weak capture lets the owner deallocate and the task stop touching it.

## Bad

```swift
@MainActor
final class Session {
    var token = "abc"

    func track() {
        Task {
            await report()
        }
    }

    private func report() async {}
}
```

## Good

```swift
@MainActor
final class Session {
    var token = "abc"

    func track() {
        Task { [weak self] in
            await self?.report()
        }
    }

    private func report() async {}
}
```

## See Also

- [swift-arc-closure-capture](arc-closure-capture.md) - the stored-closure form of the cycle
- [swift-conc-detached-task](conc-detached-task.md) - choosing the right unstructured task
