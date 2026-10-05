---
id: swift-doc-local-comment
lang: swift
prefix: doc
title: Use regular comments inside function bodies
severity: should
enforce: tool
tool: swiftlint:local_doc_comment
baseline: latest
status: verified
triggers:
  keywords: [documentation, local scope, comments]
  files: ["**/*.swift"]
related: [swift-doc-orphaned, swift-doc-every-declaration]
sources:
  - title: SwiftLint - local_doc_comment
    url: https://realm.github.io/SwiftLint/local_doc_comment.html
---
> Use regular comments instead of doc comments inside function bodies.

## Why

SwiftLint's opt-in `local_doc_comment` rule prefers regular comments over doc comments in local scopes, and the SwiftLint documentation shows the doc-comment form inside a function as a violation. Doc comments are declaration documentation consumed by tooling; inside a body there is no declaration to document, and the marker promises generated documentation that never appears.

## Bad

```swift
func process() {
    /// Fetches the first element.
    let first = [1, 2, 3].first
    print(first as Any)
}
```

## Good

```swift
func process() {
    // Fetches the first element.
    let first = [1, 2, 3].first
    print(first as Any)
}
```

## See Also

- [swift-doc-orphaned](doc-orphaned.md) - doc comments that detach from their declaration
- [swift-doc-every-declaration](doc-every-declaration.md) - documenting declarations, not statements
