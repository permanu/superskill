---
id: swift-async-stream-adapter
lang: swift
prefix: async
title: Bridge multi-value callbacks with AsyncStream
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncstream, callback, adapter]
  files: ["**/*.swift"]
related: [swift-async-sequence-over-callbacks, swift-async-stream-termination]
sources:
  - title: Swift Evolution SE-0314 - AsyncStream and AsyncThrowingStream
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md
---
> Bridge a multi-value callback API with `AsyncStream` so callers can iterate it.

## Why

SE-0314 adds `AsyncStream` and `AsyncThrowingStream` for bridging callback or delegate interfaces that yield many values over time into async contexts, because continuations adapt only single-result APIs. The stream's builder yields each callback value to the continuation, and consumers iterate the stream with `for await` like any other sequence; error-producing sources use the throwing variant and call `finish(throwing:)`.

## Bad

```swift
final class QuakeMonitor {
    var quakeHandler: (@Sendable (String) -> Void)?
    func startMonitoring() {}
    func stopMonitoring() {}
}

func reportQuakes() {
    let monitor = QuakeMonitor()
    monitor.quakeHandler = { quake in
        print(quake)
    }
    monitor.startMonitoring()
}
```

## Good

```swift
final class QuakeMonitor {
    var quakeHandler: (@Sendable (String) -> Void)?
    func startMonitoring() {}
    func stopMonitoring() {}
}

extension QuakeMonitor {
    var quakes: AsyncStream<String> {
        AsyncStream { continuation in
            let monitor = QuakeMonitor()
            monitor.quakeHandler = { quake in
                continuation.yield(quake)
            }
            monitor.startMonitoring()
        }
    }
}
```

## See Also

- [swift-async-sequence-over-callbacks](async-sequence-over-callbacks.md) - designing new stream-shaped APIs
- [swift-async-stream-termination](async-stream-termination.md) - stopping the producer when iteration ends
