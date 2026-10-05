---
id: swift-err-try-optional-discard
lang: swift
prefix: err
title: Reserve try? for cases where every failure means the same absence
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [try?, optional, discarding, decode, corruption]
  files: ["**/*.swift"]
  symbols: [try?, JSONDecoder, UserDefaults]
related: [swift-err-optional-not-failure, swift-err-no-force-try]
sources:
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Use `try?` only when mapping every failure to nil is the intended contract; otherwise preserve the error.

## Why

The Swift book defines `try?` as converting a thrown error into an Optional, appropriate when all errors are handled the same way. Applied to loading or decoding, it erases the difference between "not stored yet" and "corrupt", so callers silently rebuild state over damaged data. Keep the error whenever the caller can act differently on different failures.

## Bad

```swift
import Foundation

struct Session: Decodable {
    let userID: Int
}

func loadSession() -> Session? {
    guard let data = UserDefaults.standard.data(forKey: "session") else { return nil }
    return try? JSONDecoder().decode(Session.self, from: data)
}
```

## Good

```swift
import Foundation

struct Session: Decodable {
    let userID: Int
}

enum SessionError: Error {
    case missing
    case corrupt(underlying: any Error)
}

func loadSession() throws -> Session {
    guard let data = UserDefaults.standard.data(forKey: "session") else {
        throw SessionError.missing
    }
    do {
        return try JSONDecoder().decode(Session.self, from: data)
    } catch {
        throw SessionError.corrupt(underlying: error)
    }
}
```

## See Also

- [swift-err-optional-not-failure](err-optional-not-failure.md) - optional return types versus thrown failures
- [swift-err-no-force-try](err-no-force-try.md) - the other error-erasing operator
