---
id: swift-err-cancellation-handler
lang: swift
prefix: err
title: Run immediate cancellation cleanup in withTaskCancellationHandler
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cancellation, handler, abort, cleanup, task]
  files: ["**/*.swift"]
  symbols: [withTaskCancellationHandler, Atomic, CancellationError]
related: [swift-err-cancellation-check, swift-err-defer-cleanup]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: withTaskCancellationHandler(operation:onCancel:isolation:)
    url: https://developer.apple.com/documentation/swift/withtaskcancellationhandler(operation:oncancel:isolation:)
---
> Put cancellation cleanup in `withTaskCancellationHandler` so it fires immediately even if the task never checks.

## Why

Cleanup wired only through a thrown `CancellationError` runs at the next checkpoint, which a task blocked in non-cooperative work never reaches. Apple documents `withTaskCancellationHandler` as always and immediately invoking its handler when the task is canceled, even while the operation is still running; the handler may run concurrently with the operation. The handler therefore owns cancellation-only teardown, and shared state must be synchronized.

## Bad

```swift
final class Upload {
    var isCanceled = false

    func abort() {
        isCanceled = true
    }

    func send() async throws {
        try Task.checkCancellation()
    }
}

func run(_ upload: Upload) async throws {
    do {
        try await upload.send()
    } catch is CancellationError {
        upload.abort()
    }
}
```

## Good

```swift
import Synchronization

final class Upload: Sendable {
    private let canceled = Atomic(false)

    var isCanceled: Bool {
        canceled.load(ordering: .relaxed)
    }

    func abort() {
        canceled.store(true, ordering: .relaxed)
    }

    func send() async throws {
        try Task.checkCancellation()
    }
}

func run(_ upload: Upload) async throws {
    try await withTaskCancellationHandler {
        try await upload.send()
    } onCancel: {
        upload.abort()
    }
}
```

## See Also

- [swift-err-cancellation-check](err-cancellation-check.md) - the in-band checkpoint mechanism
- [swift-err-defer-cleanup](err-defer-cleanup.md) - ordinary scope-exit cleanup with `defer`
