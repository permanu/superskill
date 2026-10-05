---
id: swift-async-sequence-over-callbacks
lang: swift
prefix: async
title: Model repeated asynchronous values as an AsyncSequence
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncsequence, callbacks, events]
  files: ["**/*.swift"]
related: [swift-async-stream-adapter, swift-async-stream-buffering]
sources:
  - title: Swift Evolution SE-0298 - AsyncSequence
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0298-asyncsequence.md
---
> Model repeated asynchronous values as an `AsyncSequence` instead of a repeated callback.

## Why

SE-0298 introduces `AsyncSequence` for functions that return many values over time, and states the intent that APIs which would have used a notification, an informational delegate, or a multi-callback closure adopt the protocol instead. An `AsyncSequence` gives consumers `for await` iteration plus the familiar sequence algorithms, while a callback property hands each value to whichever handler is installed and offers no completion or cancellation story.

## Bad

```swift
final class Counter {
    func count(to limit: Int, onValue: @escaping @Sendable (Int) -> Void) {
        for value in 1...limit {
            onValue(value)
        }
    }
}
```

## Good

```swift
struct Counter: AsyncSequence {
    let limit: Int

    struct AsyncIterator: AsyncIteratorProtocol {
        var current = 0
        let limit: Int

        mutating func next() async -> Int? {
            guard current < limit else { return nil }
            current += 1
            return current
        }
    }

    func makeAsyncIterator() -> AsyncIterator {
        AsyncIterator(limit: limit)
    }
}
```

## See Also

- [swift-async-stream-adapter](async-stream-adapter.md) - bridging an existing callback API
- [swift-async-stream-buffering](async-stream-buffering.md) - controlling buffer growth when adapting
