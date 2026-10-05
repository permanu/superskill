---
id: swift-io-create-directory
lang: swift
prefix: io
title: Create intermediate directories when preparing a location
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [createdirectory, intermediates, paths]
  files: ["**/*.swift"]
related: [swift-io-copy-item, swift-data-directory-api]
sources:
  - title: FileManager.createDirectory(at:withIntermediateDirectories:attributes:)
    url: https://developer.apple.com/documentation/foundation/filemanager/createdirectory(at:withintermediatedirectories:attributes:)
---
> Create intermediate directories when preparing a location.

## Why

Apple documents `createDirectory(at:withIntermediateDirectories:attributes:)` as creating any nonexistent parent directories when the flag is `true`, and failing when any intermediate parent does not exist when it is `false`; with the flag set, creating a directory that already exists also succeeds. Preparing a nested path with the flag unset fails on a fresh install where the parents have not been created yet, and callers end up reimplementing the recursion. The flag makes the call idempotent for the whole path.

## Bad

```swift
import Foundation

func prepareDirectory(at url: URL) throws {
    try FileManager.default.createDirectory(
        at: url,
        withIntermediateDirectories: false,
        attributes: nil
    )
}
```

## Good

```swift
import Foundation

func prepareDirectory(at url: URL) throws {
    try FileManager.default.createDirectory(
        at: url,
        withIntermediateDirectories: true,
        attributes: nil
    )
}
```

## See Also

- [swift-io-copy-item](io-copy-item.md) - copying into the prepared directory
- [swift-data-directory-api](data-directory-api.md) - resolving the base directory through the API
