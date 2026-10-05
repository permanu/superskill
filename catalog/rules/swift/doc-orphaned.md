---
id: swift-doc-orphaned
lang: swift
prefix: doc
title: Keep doc comments attached to their declaration
severity: should
enforce: tool
tool: swiftlint:orphaned_doc_comment
baseline: latest
status: verified
triggers:
  keywords: [documentation, doc comment, attachment]
  files: ["**/*.swift"]
related: [swift-doc-every-declaration, swift-doc-local-comment]
sources:
  - title: SwiftLint - orphaned_doc_comment
    url: https://realm.github.io/SwiftLint/orphaned_doc_comment.html
---
> Attach every doc comment directly to the declaration it documents.

## Why

SwiftLint's `orphaned_doc_comment` rule reports a doc comment that is not attached to a declaration: a regular comment placed between the doc comment and the declaration, a second doc comment separated from the first, or a doc comment with no declaration after it. Documentation tooling associates `///` comments with the syntax that follows them, so an interleaved regular comment leaves the declaration undocumented.

## Bad

```swift
/// Returns the sum of the two values.
// Adds the numbers for the caller.
func sum(_ a: Int, _ b: Int) -> Int {
    a + b
}
```

## Good

```swift
/// Returns the sum of the two values.
func sum(_ a: Int, _ b: Int) -> Int {
    // Both values fit in Int for the supported ranges.
    a + b
}
```

## See Also

- [swift-doc-every-declaration](doc-every-declaration.md) - writing the comment in the first place
- [swift-doc-local-comment](doc-local-comment.md) - where regular comments belong instead
