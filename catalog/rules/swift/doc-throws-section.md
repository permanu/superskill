---
id: swift-doc-throws-section
lang: swift
prefix: doc
title: Document thrown errors with a Throws bullet
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, throws, errors]
  files: ["**/*.swift"]
related: [swift-err-wrap-context, swift-doc-parameter-section]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Document the errors a throwing function emits with a `- Throws` bullet.

## Why

The API Design Guidelines list `Throws` among the recognized bullet items, and the throwing contract is part of the function's interface: callers write `catch` clauses against what the documentation promises. Without the bullet, the only way to learn which failures to handle is to read the implementation, and callers end up catching every error or none of them.

## Bad

```swift
import Foundation

/// Loads the configuration file.
func loadConfiguration(at path: String) throws -> String {
    try String(contentsOfFile: path, encoding: .utf8)
}
```

## Good

```swift
import Foundation

/// Loads the configuration file.
///
/// - Throws: An error if the file cannot be read or decoded as UTF-8.
func loadConfiguration(at path: String) throws -> String {
    try String(contentsOfFile: path, encoding: .utf8)
}
```

## See Also

- [swift-err-wrap-context](err-wrap-context.md) - wrapping a propagated error with operation context
- [swift-doc-parameter-section](doc-parameter-section.md) - the matching parameter markup
