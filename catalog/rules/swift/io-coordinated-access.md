---
id: swift-io-coordinated-access
lang: swift
prefix: io
title: Coordinate file access with NSFileCoordinator
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nsfilecoordinator, coordinated read, shared files]
  files: ["**/*.swift"]
related: [swift-io-copy-item, swift-data-atomic-write]
sources:
  - title: NSFileCoordinator
    url: https://developer.apple.com/documentation/foundation/nsfilecoordinator
---
> Coordinate file access with `NSFileCoordinator` when other processes share the file.

## Why

Apple documents `NSFileCoordinator` as coordinating the reading and writing of files and directories among multiple processes and objects in the same process, with the file coordinator granting access before the code that performs the action executes. Reading a file that another process may be writing can observe a partial update; the coordinated read runs inside the accessor block once the file is safe to read. Coordinators are meant to be used per file operation, not kept around.

## Bad

```swift
import Foundation

func readNotes(at url: URL) throws -> String {
    try String(contentsOf: url, encoding: .utf8)
}
```

## Good

```swift
import Foundation

func readNotes(at url: URL) throws -> String {
    var coordinatorError: NSError?
    var result = ""
    let coordinator = NSFileCoordinator()
    coordinator.coordinate(readingItemAt: url, options: [], error: &coordinatorError) { newURL in
        result = (try? String(contentsOf: newURL, encoding: .utf8)) ?? ""
    }
    if let coordinatorError { throw coordinatorError }
    return result
}
```

## See Also

- [swift-io-copy-item](io-copy-item.md) - whole-file operations the file manager performs
- [swift-data-atomic-write](data-atomic-write.md) - keeping a single writer's file intact
