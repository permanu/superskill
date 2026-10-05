---
id: swift-async-protocol-async
lang: swift
prefix: async
title: Declare asynchronous protocol requirements as async
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, protocol, requirement]
  files: ["**/*.swift"]
related: [swift-async-api-not-completion, swift-async-continuation-wrapper]
sources:
  - title: Swift Evolution SE-0296 - Async/await
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0296-async-await.md
---
> Declare asynchronous protocol requirements as `async`, not as completion-handler parameters.

## Why

SE-0296 allows a protocol requirement to be declared `async`, and such a requirement can be satisfied by either an async or a synchronous function. A completion-handler requirement forces every conformer into the callback style and every caller into the nesting it creates, while an `async` requirement lets a synchronous implementation satisfy it for free and keeps async callers in straight-line code.

## Bad

```swift
protocol UserLoading {
    func loadUser(id: Int, completion: @escaping @Sendable (Result<String, Error>) -> Void)
}
```

## Good

```swift
protocol UserLoading {
    func loadUser(id: Int) async throws -> String
}
```

## See Also

- [swift-async-api-not-completion](async-api-not-completion.md) - the same choice for concrete APIs
- [swift-async-continuation-wrapper](async-continuation-wrapper.md) - adapting conformers that still use callbacks
