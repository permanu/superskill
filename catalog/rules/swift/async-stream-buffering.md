---
id: swift-async-stream-buffering
lang: swift
prefix: async
title: Bound the buffer of an AsyncStream that can outpace its consumer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncstream, buffering, backpressure]
  files: ["**/*.swift"]
related: [swift-async-stream-adapter, swift-mem-nscache]
sources:
  - title: Swift Evolution SE-0314 - AsyncStream and AsyncThrowingStream
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md
---
> Bound the buffer of an `AsyncStream` whose producer can outpace its consumer.

## Why

SE-0314 states that every yielded element is buffered until consumed by default, and that the buffering policy controls the amount that can be stored and the mechanism for dropping values, with `bufferingNewest` and `bufferingOldest` keeping a fixed count and a limit of zero dropping immediately when nothing is awaiting. A stream fed by a high-rate source with the default unbounded policy grows without limit while the consumer is slow or absent.

## Bad

```swift
func makeNotifications() -> AsyncStream<Int> {
    AsyncStream { continuation in
        for value in 1...1000 {
            continuation.yield(value)
        }
    }
}
```

## Good

```swift
func makeNotifications() -> AsyncStream<Int> {
    AsyncStream(bufferingPolicy: .bufferingNewest(10)) { continuation in
        for value in 1...1000 {
            continuation.yield(value)
        }
    }
}
```

## See Also

- [swift-async-stream-adapter](async-stream-adapter.md) - the adapter that yields into the buffer
- [swift-mem-nscache](mem-nscache.md) - another bounded container for disposable values
