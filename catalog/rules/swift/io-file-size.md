---
id: swift-io-file-size
lang: swift
prefix: io
title: Read a file's size from its resource values
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file size, resource values, metadata]
  files: ["**/*.swift"]
related: [swift-io-mapped-read, swift-data-directory-api]
sources:
  - title: URLResourceValues.fileSize
    url: https://developer.apple.com/documentation/foundation/urlresourcevalues/filesize
  - title: URL.resourceValues(forKeys:)
    url: https://developer.apple.com/documentation/foundation/url/resourcevalues(forkeys:)
---
> Read a file's size from its resource values instead of reading the file.

## Why

Apple documents `URLResourceValues.fileSize` as the total file size in bytes for regular files, and `URL.resourceValues(forKeys:)` as returning the resource values identified by the requested keys. Loading the contents just to count bytes reads the whole file from disk and allocates its size in memory for a number the file system already tracks. The resource values call fetches the metadata and leaves the contents on disk.

## Bad

```swift
import Foundation

func isLarge(_ url: URL) throws -> Bool {
    let data = try Data(contentsOf: url)
    return data.count > 1_000_000
}
```

## Good

```swift
import Foundation

func isLarge(_ url: URL) throws -> Bool {
    let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
    return size > 1_000_000
}
```

## See Also

- [swift-io-mapped-read](io-mapped-read.md) - reading the contents when they are needed
- [swift-data-directory-api](data-directory-api.md) - resolving file URLs without hard-coded paths
