---
id: swift-doc-see-also-bullet
lang: swift
prefix: doc
title: Cross-reference related symbols with a SeeAlso bullet
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, cross-reference, SeeAlso]
  files: ["**/*.swift"]
related: [swift-doc-callouts, swift-doc-markup]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Cross-reference related symbols with a `- SeeAlso` bullet.

## Why

The API Design Guidelines include `SeeAlso` in the recognized bullet items and use it in the sample comment to point at related symbols. A cross-reference written into the discussion prose is easy to miss and hard for tooling to extract; the `SeeAlso` bullet collects the pointers at the end of the comment where readers scan for alternatives.

## Bad

```swift
struct Profile {
    /// Returns the display name.
    /// Use formattedName for the name with the title.
    func displayName() -> String { "Ada" }

    /// Returns the display name with the title.
    func formattedName() -> String { "Dr. Ada" }
}
```

## Good

```swift
struct Profile {
    /// Returns the display name.
    ///
    /// - SeeAlso: `formattedName`
    func displayName() -> String { "Ada" }

    /// Returns the display name with the title.
    func formattedName() -> String { "Dr. Ada" }
}
```

## See Also

- [swift-doc-callouts](doc-callouts.md) - the callout bullets readers see as asides
- [swift-doc-markup](doc-markup.md) - the wider set of recognized markup elements
