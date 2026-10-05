---
id: swift-io-copy-item
lang: swift
prefix: io
title: Copy files with FileManager instead of read and write
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [copyitem, file copy, metadata]
  files: ["**/*.swift"]
related: [swift-io-coordinated-access, swift-io-create-directory]
sources:
  - title: FileManager.copyItem(at:to:)
    url: https://developer.apple.com/documentation/foundation/filemanager/copyitem(at:to:)
---
> Copy files with `FileManager.copyItem(at:to:)` instead of reading and writing them.

## Why

Apple documents `copyItem(at:to:)` as copying the file at the source URL to a new location synchronously, copying a directory and all of its contents including hidden files, and stopping with an error if a file already exists at the destination. Reading the source into `Data` and writing it back loses the file's metadata, cannot copy directories, and doubles the memory cost. The file manager performs the copy as one operation and reports collisions as errors.

## Bad

```swift
import Foundation

func duplicate(_ url: URL, to destination: URL) throws {
    let data = try Data(contentsOf: url)
    try data.write(to: destination)
}
```

## Good

```swift
import Foundation

func duplicate(_ url: URL, to destination: URL) throws {
    try FileManager.default.copyItem(at: url, to: destination)
}
```

## See Also

- [swift-io-coordinated-access](io-coordinated-access.md) - reads that must not race a writer
- [swift-io-create-directory](io-create-directory.md) - preparing the destination directory
