---
id: swift-err-no-force-try
lang: swift
prefix: err
title: Never force-try a fallible call in shipping code
severity: must
enforce: tool
tool: swiftlint:force_try
baseline: latest
status: verified
triggers:
  keywords: [try!, force try, crash, propagation]
  files: ["**/*.swift"]
  symbols: [try!, Data, FileManager]
related: [swift-err-try-optional-discard, swift-err-no-fatal-recoverable]
sources:
  - title: SwiftLint - Force Try
    url: https://realm.github.io/SwiftLint/force_try.html
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Never apply `try!` to a fallible call; propagate the error or handle it with `do`-`catch`.

## Why

A force try converts any failure into a runtime trap, so a missing file or a decode regression that should surface as an error path terminates the process instead. SwiftLint ships `force_try` enabled by default at error severity for this reason. The Swift book sanctions `try!` only when the call is known not to throw at runtime; that condition is narrow enough to keep force tries out of normal production paths.

## Bad

```swift
import Foundation

func settingsData(at url: URL) -> Data {
    try! Data(contentsOf: url)
}
```

## Good

```swift
import Foundation

func settingsData(at url: URL) throws -> Data {
    try Data(contentsOf: url)
}
```

## See Also

- [swift-err-try-optional-discard](err-try-optional-discard.md) - the silent sibling of `try!`
- [swift-err-no-fatal-recoverable](err-no-fatal-recoverable.md) - why a crash is not an error strategy
