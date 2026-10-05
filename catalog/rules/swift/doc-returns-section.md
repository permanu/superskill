---
id: swift-doc-returns-section
lang: swift
prefix: doc
title: Document non-obvious return values with a Returns bullet
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, return value, doc comment]
  files: ["**/*.swift"]
related: [swift-doc-parameter-section, swift-doc-summary-verb]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Document non-obvious return values with a `- Returns` bullet.

## Why

The API Design Guidelines require a function's documentation to describe what the function returns, while omitting null effects and `Void` returns. The summary states the point of the call; the `Returns` bullet carries the details a caller needs to consume the result, such as what the value means in edge cases, without restating the type from the signature.

## Bad

```swift
/// Returns a summary of the report.
func summarize(_ lines: [String]) -> String {
    lines.prefix(3).joined(separator: "\n")
}
```

## Good

```swift
/// Returns a summary of the report.
///
/// - Returns: The first three lines joined by newlines.
func summarize(_ lines: [String]) -> String {
    lines.prefix(3).joined(separator: "\n")
}
```

## See Also

- [swift-doc-parameter-section](doc-parameter-section.md) - documenting parameters with the same markup
- [swift-doc-summary-verb](doc-summary-verb.md) - choosing the verb that opens the summary
