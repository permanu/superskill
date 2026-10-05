---
id: swift-async-api-not-completion
lang: swift
prefix: async
title: Expose new asynchronous operations as async functions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, completion handler, api design]
  files: ["**/*.swift"]
related: [swift-async-continuation-wrapper, swift-async-overload-sync]
sources:
  - title: Swift Evolution SE-0296 - Async/await
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0296-async-await.md
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Expose new asynchronous operations as `async` functions instead of completion handlers.

## Why

SE-0296 introduces async functions as the replacement for completion handlers, which produce nested closures, make error handling verbose, complicate conditional execution, and are easy to leave uncalled. The Concurrency chapter shows the same problem: a short sequence of dependent requests written with completion handlers becomes nested closures. An `async` function keeps the calls in straight-line code, and `try await` carries errors and suspension points through the normal control flow.

## Bad

```swift
import Foundation

func loadUser(id: Int, completion: @escaping @Sendable (Result<String, Error>) -> Void) {
    DispatchQueue.global().async {
        completion(.success("user-\(id)"))
    }
}
```

## Good

```swift
func loadUser(id: Int) async throws -> String {
    "user-\(id)"
}
```

## See Also

- [swift-async-continuation-wrapper](async-continuation-wrapper.md) - adapting an existing callback API to async
- [swift-async-overload-sync](async-overload-sync.md) - keeping the synchronous form for existing callers
