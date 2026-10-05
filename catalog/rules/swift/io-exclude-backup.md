---
id: swift-io-exclude-backup
lang: swift
prefix: io
title: Exclude recreatable files from backup
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [backup, exclusion, downloadable]
  files: ["**/*.swift"]
related: [swift-data-caches, swift-io-temp-directory]
sources:
  - title: Using the file system effectively
    url: https://developer.apple.com/documentation/foundation/using-the-file-system-effectively
  - title: URLResourceValues.isExcludedFromBackup
    url: https://developer.apple.com/documentation/foundation/urlresourcevalues/isexcludedfrombackup
---
> Exclude recreatable files from backup with the resource value.

## Why

Apple's "Using the file system effectively" article states that any file the app can recreate or redownload, particularly large media files, should be excluded from backup, and shows setting `isExcludedFromBackup` on the item's resource values. A file kept inside Application Support or Documents is included in regular backups by default, so a re-downloadable asset inflates every backup the person takes and slows restores. The exclusion flag keeps the file on disk without carrying it into the backup.

## Bad

```swift
import Foundation

func storePreview(_ data: Data, at url: URL) throws {
    try data.write(to: url, options: .atomic)
}
```

## Good

```swift
import Foundation

func storePreview(_ data: Data, at url: URL) throws {
    try data.write(to: url, options: .atomic)

    var values = try url.resourceValues(forKeys: [.isExcludedFromBackupKey])
    values.isExcludedFromBackup = true
    var mutableURL = url
    try mutableURL.setResourceValues(values)
}
```

## See Also

- [swift-data-caches](data-caches.md) - the directory that is never backed up
- [swift-io-temp-directory](io-temp-directory.md) - files that do not survive the launch
