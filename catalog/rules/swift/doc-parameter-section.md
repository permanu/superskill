---
id: swift-doc-parameter-section
lang: swift
prefix: doc
title: Document every parameter with a Parameter bullet
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, parameter, doc comment]
  files: ["**/*.swift"]
related: [swift-doc-returns-section, swift-doc-callouts]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Document every parameter with a `- Parameter` bullet.

## Why

The API Design Guidelines define the `Parameter` bullet as part of the recognized symbol documentation markup, and the sample comment in the guidelines includes a Parameters section. Parameter names are chosen to serve documentation, so the bullet gives each name its explanation in the place readers look for it instead of leaving the meaning spread through the prose summary.

## Bad

```swift
/// Returns a string with the value repeated.
func repeatValue(_ value: String, times: Int) -> String {
    String(repeating: value, count: times)
}
```

## Good

```swift
/// Returns a string with `value` repeated `times` times.
///
/// - Parameter value: The string to repeat.
/// - Parameter times: The number of repetitions.
func repeatValue(_ value: String, times: Int) -> String {
    String(repeating: value, count: times)
}
```

## See Also

- [swift-doc-returns-section](doc-returns-section.md) - documenting the returned value
- [swift-doc-callouts](doc-callouts.md) - the other recognized bullet items
