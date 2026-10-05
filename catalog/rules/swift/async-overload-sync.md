---
id: swift-async-overload-sync
lang: swift
prefix: async
title: Add the async form under the same name as the synchronous API
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, overload, api evolution]
  files: ["**/*.swift"]
related: [swift-async-api-not-completion, swift-async-protocol-async]
sources:
  - title: Swift Evolution SE-0296 - Async/await
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0296-async-await.md
---
> Add the async form of an API under the same name as the synchronous form.

## Why

SE-0296 allows overloads that differ only in `async`, and its overload-resolution rule prefers the async function in an asynchronous context and the synchronous function in a synchronous context. That lets an API add an async form without breaking existing callers and without the pervasive `Async` suffix scheme the proposal cites as the alternative it avoids. The call site then reads the same in both worlds.

## Bad

```swift
func loadUser(id: Int) -> String {
    "user-\(id)"
}

func loadUserAsync(id: Int) async -> String {
    "user-\(id)"
}
```

## Good

```swift
func loadUser(id: Int) -> String {
    "user-\(id)"
}

func loadUser(id: Int) async -> String {
    "user-\(id)"
}
```

## See Also

- [swift-async-api-not-completion](async-api-not-completion.md) - why the async form is the one to add
- [swift-async-protocol-async](async-protocol-async.md) - the same naming in protocols
