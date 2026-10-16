---
id: swift-doc-every-declaration
lang: swift
prefix: doc
title: Document non-obvious API contracts and required reference surfaces
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, doc comment, public API]
  files: ["**/*.swift"]
related: [swift-doc-summary-fragment, swift-doc-orphaned]
sources:
  - title: Google Engineering Practices - Comments and Documentation
    url: https://google.github.io/eng-practices/review/reviewer/looking-for.html
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
  - title: SwiftLint - missing_docs
    url: https://realm.github.io/SwiftLint/missing_docs.html
---
> Respect required API documentation coverage; otherwise document non-obvious contracts rather than narrating every declaration.

## Why

Swift's API guidelines explicitly recommend a documentation comment for every declaration, citing its value in API design; the opt-in SwiftLint rule can enforce a project's chosen reference coverage. This rule adapts that broad recommendation to projects with a minimal-comment policy: prefer clear names, then document ownership, lifetime and other contracts the signature cannot express. Preserve required project documentation coverage without treating an optional linter as universally enabled. The examples assume no blanket documentation requirement.

## Bad

```swift
public final class Counter {
    public var value = 0
    public func makeLiveReader() -> () -> Int { { self.value } }
}
```

## Good

```swift
public final class Counter {
    public var value = 0
    /// Returns a live reader that strongly retains this counter for its lifetime.
    public func makeLiveReader() -> () -> Int { { self.value } }
}
```

## See Also

- [swift-doc-summary-fragment](doc-summary-fragment.md) - shaping the summary that opens the comment
- [swift-doc-orphaned](doc-orphaned.md) - keeping the comment attached to its declaration
