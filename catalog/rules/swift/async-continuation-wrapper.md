---
id: swift-async-continuation-wrapper
lang: swift
prefix: async
title: Wrap single-result callback APIs with a checked continuation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [continuation, callback, async adapter]
  files: ["**/*.swift"]
related: [swift-async-api-not-completion, swift-conc-continuation-once]
sources:
  - title: Swift Evolution SE-0314 - AsyncStream and AsyncThrowingStream
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md
---
> Wrap a single-result callback API in an async function with a checked continuation.

## Why

SE-0314 shows the continuation adapters as the way to bridge callback-based APIs into async/await: the wrapper calls the callback API and resumes the continuation with the result or the error. The wrapper is written once, at the boundary, and every caller then uses straight-line code. Continuations are for APIs that produce a single result; multi-value callbacks use `AsyncStream` instead.

## Bad

```swift
import Foundation

func loadUser(id: Int, completion: @escaping @Sendable (Result<String, Error>) -> Void) {
    DispatchQueue.global().async {
        completion(.success("user-\(id)"))
    }
}

func displayUser(id: Int) {
    loadUser(id: id) { result in
        switch result {
        case .success(let name):
            print(name)
        case .failure(let error):
            print(error)
        }
    }
}
```

## Good

```swift
import Foundation

func loadUser(id: Int, completion: @escaping @Sendable (Result<String, Error>) -> Void) {
    DispatchQueue.global().async {
        completion(.success("user-\(id)"))
    }
}

func loadUser(id: Int) async throws -> String {
    try await withCheckedThrowingContinuation { continuation in
        loadUser(id: id) { result in
            continuation.resume(with: result)
        }
    }
}
```

## See Also

- [swift-async-api-not-completion](async-api-not-completion.md) - why new APIs skip the callback shape
- [swift-conc-continuation-once](conc-continuation-once.md) - resuming a continuation exactly once
