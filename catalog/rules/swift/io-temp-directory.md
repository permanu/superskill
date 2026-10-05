---
id: swift-io-temp-directory
lang: swift
prefix: io
title: Write short-lived files to the temporary directory
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [temporary directory, scratch files]
  files: ["**/*.swift"]
related: [swift-data-caches, swift-data-directory-api]
sources:
  - title: Using the file system effectively
    url: https://developer.apple.com/documentation/foundation/using-the-file-system-effectively
---
> Write short-lived files to the temporary directory instead of a permanent one.

## Why

Apple's "Using the file system effectively" article states that the temporary directory is for files with a short lifespan, such as the side effects of computational operations or one-time downloads that can be discarded after use, that the system may purge the directory while the app is not running, and that the directory is not backed up. Files written to Application Support or Documents instead are backed up, survive relaunches, and accumulate until something deletes them. The article also says to delete temporary files as soon as they are no longer needed.

## Bad

```swift
import Foundation

func scratchURL() throws -> URL {
    let directory = try FileManager.default.url(
        for: .applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
    )
    return directory.appendingPathComponent("scratch.dat")
}
```

## Good

```swift
import Foundation

func scratchURL() -> URL {
    FileManager.default.temporaryDirectory
        .appendingPathComponent("scratch.dat")
}
```

## See Also

- [swift-data-caches](data-caches.md) - files that persist longer but stay purgeable
- [swift-data-directory-api](data-directory-api.md) - resolving directories through the API
