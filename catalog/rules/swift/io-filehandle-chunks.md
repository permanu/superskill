---
id: swift-io-filehandle-chunks
lang: swift
prefix: io
title: Stream large files in chunks with FileHandle
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [filehandle, streaming, chunks]
  files: ["**/*.swift"]
related: [swift-io-mapped-read, swift-mem-buffer-borrowing]
sources:
  - title: FileHandle.read(upToCount:)
    url: https://developer.apple.com/documentation/foundation/filehandle/read(uptocount:)
  - title: FileHandle
    url: https://developer.apple.com/documentation/foundation/filehandle
---
> Stream large files in chunks with `FileHandle` instead of loading them whole.

## Why

Apple documents `FileHandle` as an object-oriented wrapper for a file descriptor that can read, write, and seek within a file, and `read(upToCount:)` as reading data synchronously up to the specified number of bytes, returning the data from the current file pointer or an empty object at end of file. Reading a whole file into one `Data` allocates its full size in memory before any of it is processed; the chunked loop keeps only one buffer live and can stop as soon as the work is done.

## Bad

```swift
import Foundation

func lineCount(at url: URL) throws -> Int {
    let data = try Data(contentsOf: url)
    return data.filter { $0 == 0x0A }.count
}
```

## Good

```swift
import Foundation

func lineCount(at url: URL) throws -> Int {
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }

    var count = 0
    while let chunk = try handle.read(upToCount: 4096), !chunk.isEmpty {
        count += chunk.filter { $0 == 0x0A }.count
    }
    return count
}
```

## See Also

- [swift-io-mapped-read](io-mapped-read.md) - the alternative for large read-only files
- [swift-mem-buffer-borrowing](mem-buffer-borrowing.md) - lending storage without copying
