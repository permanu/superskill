---
id: swift-net-stream-bytes
lang: swift
prefix: net
title: Process a response while it downloads
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncbytes, streaming, bytes]
  files: ["**/*.swift"]
related: [swift-net-async-data, swift-async-stream-adapter]
sources:
  - title: URLSession.bytes(for:delegate:)
    url: https://developer.apple.com/documentation/foundation/urlsession/bytes(for:delegate:)
  - title: URLSession.data(from:)
    url: https://developer.apple.com/documentation/foundation/urlsession/data(from:)
---
> Process a response while it downloads instead of waiting for the whole body.

## Why

Apple documents `bytes(for:delegate:)` as retrieving the contents of a URL and delivering an asynchronous sequence of bytes, and states that it is the method to use when you want to process the bytes while the transfer is underway, iterating with a `for await` loop. `data(from:)` is documented as the method that waits until the session finishes transferring and returns a single `Data` instance. For a large or streamed response, the sequence lets each byte be handled as it arrives and stops early when the consumer has what it needs.

## Bad

```swift
import Foundation

func lineCount(of url: URL) async throws -> Int {
    let (data, _) = try await URLSession.shared.data(from: url)
    return data.filter { $0 == 0x0A }.count
}
```

## Good

```swift
import Foundation

func lineCount(of url: URL) async throws -> Int {
    let (bytes, _) = try await URLSession.shared.bytes(from: url)
    var count = 0
    for try await byte in bytes where byte == 0x0A {
        count += 1
    }
    return count
}
```

## See Also

- [swift-net-async-data](net-async-data.md) - the whole-body convenience method
- [swift-async-stream-adapter](async-stream-adapter.md) - bridging callback streams into async sequences
