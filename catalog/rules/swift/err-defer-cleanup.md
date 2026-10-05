---
id: swift-err-defer-cleanup
lang: swift
prefix: err
title: Register cleanup with defer immediately after acquiring a resource
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [defer, cleanup, resource, release, leak]
  files: ["**/*.swift"]
  symbols: [defer, close, stop]
related: [swift-err-cancellation-handler]
sources:
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Release paired resources with a `defer` block placed directly after acquisition.

## Why

The Swift book documents `defer` as running before execution leaves the scope regardless of how it leaves: a thrown error, `return`, or `break`. Release code written after the operation is skipped when the operation throws, leaking file descriptors, locks, and connections. Registering cleanup at acquisition makes release unconditional and keeps the pairing visible in one place.

## Bad

```swift
enum SensorError: Error {
    case faultyReading
}

final class Sensor {
    var shouldFail = false

    func start() {}
    func stop() {}

    func read() throws -> Int {
        if shouldFail { throw SensorError.faultyReading }
        return 42
    }
}

func measure(_ sensor: Sensor) throws -> Int {
    sensor.start()
    let value = try sensor.read()
    sensor.stop()
    return value
}
```

## Good

```swift
enum SensorError: Error {
    case faultyReading
}

final class Sensor {
    var shouldFail = false

    func start() {}
    func stop() {}

    func read() throws -> Int {
        if shouldFail { throw SensorError.faultyReading }
        return 42
    }
}

func measure(_ sensor: Sensor) throws -> Int {
    sensor.start()
    defer { sensor.stop() }
    return try sensor.read()
}
```

## See Also

- [swift-err-cancellation-handler](err-cancellation-handler.md) - cleanup that must also fire on cancellation while suspended
