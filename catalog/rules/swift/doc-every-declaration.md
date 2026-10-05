---
id: swift-doc-every-declaration
lang: swift
prefix: doc
title: Document every declaration
severity: should
enforce: both
tool: swiftlint:missing_docs
baseline: latest
status: verified
triggers:
  keywords: [documentation, doc comment, public API]
  files: ["**/*.swift"]
related: [swift-doc-summary-fragment, swift-doc-orphaned]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
  - title: SwiftLint - missing_docs
    url: https://realm.github.io/SwiftLint/missing_docs.html
---
> Write a documentation comment for every declaration.

## Why

The API Design Guidelines require a documentation comment for every declaration, because the insights gained while writing it surface design problems early. A declaration whose purpose cannot be stated in a summary is a declaration that needs redesign, not a missing comment. SwiftLint's opt-in `missing_docs` rule flags undocumented `open` and `public` declarations; the remaining declarations rely on review.

## Bad

```swift
public struct Temperature {
    public var celsius: Double

    public func fahrenheit() -> Double {
        celsius * 9 / 5 + 32
    }
}
```

## Good

```swift
/// A temperature value stored in degrees Celsius.
public struct Temperature {
    /// The temperature in degrees Celsius.
    public var celsius: Double

    /// Returns the temperature converted to degrees Fahrenheit.
    public func fahrenheit() -> Double {
        celsius * 9 / 5 + 32
    }
}
```

## See Also

- [swift-doc-summary-fragment](doc-summary-fragment.md) - shaping the summary that opens the comment
- [swift-doc-orphaned](doc-orphaned.md) - keeping the comment attached to its declaration
