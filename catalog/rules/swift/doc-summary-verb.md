---
id: swift-doc-summary-verb
lang: swift
prefix: doc
title: Open the summary with the verb that matches the declaration kind
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, summary, verb]
  files: ["**/*.swift"]
related: [swift-doc-summary-fragment, swift-doc-returns-section]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Open the summary with the verb that matches the declaration kind.

## Why

The API Design Guidelines prescribe the opening by declaration kind: methods and functions describe what they do and what they return, subscripts describe what they access, initializers describe what they create, and all other declarations describe what the entity is. The verb tells the reader the relationship between the declaration and its value before the rest of the fragment is read.

## Bad

```swift
struct Playlist {
    var songs: [String] = []

    /// The song at the given position.
    subscript(index: Int) -> String {
        songs[index]
    }
}
```

## Good

```swift
struct Playlist {
    var songs: [String] = []

    /// Accesses the song at the given position.
    subscript(index: Int) -> String {
        songs[index]
    }
}
```

## See Also

- [swift-doc-summary-fragment](doc-summary-fragment.md) - the sentence form the verb appears in
- [swift-doc-returns-section](doc-returns-section.md) - documenting the returned value
