---
id: swift-data-atomic-write
lang: swift
prefix: data
title: Write files atomically
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [atomic, file write, data]
  files: ["**/*.swift"]
related: [swift-data-directory-api, swift-err-defer-cleanup]
sources:
  - title: Data.WritingOptions.atomic
    url: https://developer.apple.com/documentation/foundation/nsdata/writingoptions/atomic
  - title: Data.write(to:options:)
    url: https://developer.apple.com/documentation/foundation/data/write(to:options:)
---
> Write files atomically so an interrupted write cannot truncate the old contents.

## Why

Apple documents the `atomic` writing option as writing the data to an auxiliary file first and replacing the original with the auxiliary file when the write completes. A direct write updates the destination in place, so a crash, a full disk, or a termination mid-write leaves a partially written file where the previous contents used to be. The atomic option keeps the old file intact until the new contents are complete.

## Bad

```swift
import Foundation

func save(_ data: Data, to url: URL) throws {
    try data.write(to: url)
}
```

## Good

```swift
import Foundation

func save(_ data: Data, to url: URL) throws {
    try data.write(to: url, options: .atomic)
}
```

## See Also

- [swift-data-directory-api](data-directory-api.md) - locating the directory to write into
- [swift-err-defer-cleanup](err-defer-cleanup.md) - releasing resources on every exit path
