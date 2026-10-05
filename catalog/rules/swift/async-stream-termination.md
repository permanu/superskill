---
id: swift-async-stream-termination
lang: swift
prefix: async
title: Clean up the producer in the stream's onTermination handler
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncstream, termination, cleanup]
  files: ["**/*.swift"]
related: [swift-async-stream-adapter, swift-err-cancellation-handler]
sources:
  - title: Swift Evolution SE-0314 - AsyncStream and AsyncThrowingStream
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md
---
> Stop the underlying producer in the stream's `onTermination` handler.

## Why

SE-0314 documents `onTermination` as the callback invoked when iteration ends, when the stream goes out of scope, or when the containing task is canceled, and states that it is safe to use the handler to clean up resources opened at the start of the stream. A stream that starts monitoring, reading, or observing without a termination handler leaves the producer running after the consumer has gone away, and cancellation cannot reach it.

## Bad

```swift
func startMonitoring(_ handler: @escaping @Sendable (String) -> Void) -> @Sendable () -> Void {
    handler("quake")
    return {}
}

func makeQuakes() -> AsyncStream<String> {
    AsyncStream { continuation in
        _ = startMonitoring { quake in
            continuation.yield(quake)
        }
    }
}
```

## Good

```swift
func startMonitoring(_ handler: @escaping @Sendable (String) -> Void) -> @Sendable () -> Void {
    handler("quake")
    return {}
}

func makeQuakes() -> AsyncStream<String> {
    AsyncStream { continuation in
        let stop = startMonitoring { quake in
            continuation.yield(quake)
        }
        continuation.onTermination = { _ in
            stop()
        }
    }
}
```

## See Also

- [swift-async-stream-adapter](async-stream-adapter.md) - the adapter this cleanup belongs to
- [swift-err-cancellation-handler](err-cancellation-handler.md) - immediate cleanup on cancellation
