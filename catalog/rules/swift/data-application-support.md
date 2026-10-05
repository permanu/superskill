---
id: swift-data-application-support
lang: swift
prefix: data
title: Store app-managed support files in Application Support
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [application support, file storage, directory]
  files: ["**/*.swift"]
related: [swift-data-caches, swift-data-directory-api]
sources:
  - title: Using the file system effectively
    url: https://developer.apple.com/documentation/foundation/using-the-file-system-effectively
  - title: FileManager.SearchPathDirectory.applicationSupportDirectory
    url: https://developer.apple.com/documentation/foundation/filemanager/searchpathdirectory/applicationsupportdirectory
---
> Store app-managed support files in Application Support.

## Why

Apple's "Using the file system effectively" article states that support files an app needs to operate but does not want openly visible belong in the Application Support directory, which stores configuration files, templates, and modified versions of bundled defaults, and that the system includes this directory in regular backups. The `applicationSupportDirectory` search path resolves that location. Files placed in Documents instead are visible to the person using the app and exposed to file sharing, which is wrong for internal state.

## Bad

```swift
import Foundation

func supportFileURL() throws -> URL {
    try FileManager.default.url(
        for: .documentDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
    )
}
```

## Good

```swift
import Foundation

func supportFileURL() throws -> URL {
    try FileManager.default.url(
        for: .applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
    )
}
```

## See Also

- [swift-data-caches](data-caches.md) - the directory for regenerable files
- [swift-data-directory-api](data-directory-api.md) - resolving directories without hard-coded paths
