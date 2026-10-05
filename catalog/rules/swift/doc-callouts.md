---
id: swift-doc-callouts
lang: swift
prefix: doc
title: Mark warnings and notes with recognized callout bullets
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, callout, note, warning]
  files: ["**/*.swift"]
related: [swift-doc-see-also-bullet, swift-doc-markup]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Mark warnings, notes, and preconditions with recognized callout bullets.

## Why

The API Design Guidelines list the recognized bullet items that tools give special treatment, including `Attention`, `Important`, `Note`, `Precondition`, and `Warning`. A caution written as ordinary prose blends into the discussion; the recognized bullet raises it to a callout that readers and documentation renderers present as an aside, so the constraint is seen before the code is used.

## Bad

```swift
import Foundation

/// Writes the data to disk.
/// The file at the path is overwritten without warning.
func write(_ data: Data, to path: String) throws {
    try data.write(to: URL(fileURLWithPath: path))
}
```

## Good

```swift
import Foundation

/// Writes the data to disk.
///
/// - Important: The file at `path` is overwritten without warning.
func write(_ data: Data, to path: String) throws {
    try data.write(to: URL(fileURLWithPath: path))
}
```

## See Also

- [swift-doc-see-also-bullet](doc-see-also-bullet.md) - cross-references use the same bullet markup
- [swift-doc-markup](doc-markup.md) - the wider set of recognized markup elements
