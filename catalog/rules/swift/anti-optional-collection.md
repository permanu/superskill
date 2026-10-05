---
id: swift-anti-optional-collection
lang: swift
prefix: anti
title: Do not use Optional for a collection whose empty state suffices
severity: should
enforce: both
tool: swiftlint:discouraged_optional_collection
baseline: latest
status: verified
triggers:
  keywords: [optional, collection, empty]
  files: ["**/*.swift"]
related: [swift-type-optional-absence, swift-anti-optional-boolean]
sources:
  - title: SwiftLint - discouraged_optional_collection
    url: https://realm.github.io/SwiftLint/discouraged_optional_collection.html
---
> Do not use `Optional` for a collection whose `nil` means empty.

## Why

SwiftLint's opt-in `discouraged_optional_collection` rule prefers an empty collection over an optional collection. An optional array or dictionary whose `nil` is collapsed with `?? []` or `?.count ?? 0` makes every consumer repeat the collapse and hides the distinction it claims to model. A non-optional collection with an empty default states the same information once and keeps the optional type for absence that callers must actually handle.

## Bad

```swift
struct Playlist {
    var songs: [String]?
}

let playlist = Playlist(songs: nil)
print(playlist.songs?.count ?? 0)
```

## Good

```swift
struct Playlist {
    var songs: [String] = []
}

let playlist = Playlist()
print(playlist.songs.count)
```

## See Also

- [swift-type-optional-absence](type-optional-absence.md) - when absence is real, use Optional
- [swift-anti-optional-boolean](anti-optional-boolean.md) - the same decision for booleans
