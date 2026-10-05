---
id: swift-net-async-data
lang: swift
prefix: net
title: Load network data with the async URLSession methods
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [urlsession, async, data task]
  files: ["**/*.swift"]
related: [swift-async-api-not-completion, swift-net-stream-bytes]
sources:
  - title: URLSession.data(from:)
    url: https://developer.apple.com/documentation/foundation/urlsession/data(from:)
---
> Load network data with the async `URLSession` methods instead of data tasks and callbacks.

## Why

Apple documents `data(from:)` as a convenience method that loads data using a URL and creates and resumes a `URLSessionDataTask` internally, returning the data and the response. The callback form requires creating the task, resuming it, and handling the result inside a closure; the async form returns the same pair at the call site, where `try await` carries errors and cancellation. The task lifecycle that the convenience method manages is the same one the callback form exposes.

## Bad

```swift
import Foundation

func load(_ url: URL, completion: @escaping @Sendable (Data?) -> Void) {
    let task = URLSession.shared.dataTask(with: url) { data, _, _ in
        completion(data)
    }
    task.resume()
}
```

## Good

```swift
import Foundation

func load(_ url: URL) async throws -> Data {
    let (data, _) = try await URLSession.shared.data(from: url)
    return data
}
```

## See Also

- [swift-async-api-not-completion](async-api-not-completion.md) - why the async form is the default for new APIs
- [swift-net-stream-bytes](net-stream-bytes.md) - processing a response while it downloads
