---
id: swift-data-directory-api
lang: swift
prefix: data
title: Resolve directories through the file manager APIs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [directory, file manager, hard-coded path]
  files: ["**/*.swift"]
related: [swift-data-application-support, swift-data-caches]
sources:
  - title: Using the file system effectively
    url: https://developer.apple.com/documentation/foundation/using-the-file-system-effectively
  - title: FileManager.url(for:in:appropriateFor:create:)
    url: https://developer.apple.com/documentation/foundation/filemanager/url(for:in:appropriateFor:create:)
---
> Resolve directories through the file manager APIs instead of hard-coded paths.

## Why

Apple's "Using the file system effectively" article states that the directory APIs should be used whenever possible and that paths to common directories must not be hard-coded, because apps such as Finder localize directory names when presenting them. The `url(for:in:appropriateFor:create:)` method locates and optionally creates the requested directory, including the Application Support and Caches directories, and returns its URL. A concatenated path breaks when the container moves and bypasses the per-directory behaviors the system provides.

## Bad

```swift
import Foundation

let cachePath = NSHomeDirectory() + "/Library/Caches/com.example.app"
print(cachePath)
```

## Good

```swift
import Foundation

let cacheURL = try FileManager.default.url(
    for: .cachesDirectory,
    in: .userDomainMask,
    appropriateFor: nil,
    create: true
)
print(cacheURL)
```

## See Also

- [swift-data-application-support](data-application-support.md) - the directory for app support files
- [swift-data-caches](data-caches.md) - the directory for regenerable files
