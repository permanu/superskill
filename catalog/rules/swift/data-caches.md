---
id: swift-data-caches
lang: swift
prefix: data
title: Store regenerable files in Caches
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [caches, purgeable, file storage]
  files: ["**/*.swift"]
related: [swift-data-application-support, swift-data-directory-api]
sources:
  - title: Using the file system effectively
    url: https://developer.apple.com/documentation/foundation/using-the-file-system-effectively
  - title: FileManager.SearchPathDirectory.cachesDirectory
    url: https://developer.apple.com/documentation/foundation/filemanager/searchpathdirectory/cachesdirectory
---
> Store regenerable files in the Caches directory.

## Why

Apple's "Using the file system effectively" article states that files the app does not require to operate but that improve performance, such as database cache files and transient downloaded content, belong in the caches directory, and that the system may purge this directory while the app is not running, so the app must be able to operate without them or regenerate them. The `cachesDirectory` search path resolves that location, and the system excludes it from backups. Keeping caches in Application Support grows the backup with data the app can rebuild.

## Bad

```swift
import Foundation

func cacheFileURL() throws -> URL {
    try FileManager.default.url(
        for: .applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
    )
}
```

## Good

```swift
import Foundation

func cacheFileURL() throws -> URL {
    try FileManager.default.url(
        for: .cachesDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
    )
}
```

## See Also

- [swift-data-application-support](data-application-support.md) - the directory for files the app needs
- [swift-data-directory-api](data-directory-api.md) - resolving directories without hard-coded paths
