---
id: swift-io-mapped-read
lang: swift
prefix: io
title: Memory-map large read-only files
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mappedifSafe, memory map, reading]
  files: ["**/*.swift"]
related: [swift-io-filehandle-chunks, swift-io-file-size]
sources:
  - title: NSData.ReadingOptions.mappedIfSafe
    url: https://developer.apple.com/documentation/foundation/nsdata/readingoptions/mappedifsafe
  - title: Data.ReadingOptions
    url: https://developer.apple.com/documentation/foundation/data/readingoptions
---
> Memory-map large read-only files instead of copying them into memory.

## Why

Apple documents `mappedIfSafe` as a hint that the file should be mapped into virtual memory if possible and safe, and `Data.ReadingOptions` as the options that control reading data from a URL. A plain read copies the file's bytes into a freshly allocated buffer; the mapped read asks the system to page the file in on demand, so untouched regions never consume memory. The hint applies when the file is not expected to change underneath the reader.

## Bad

```swift
import Foundation

func firstBytes(of url: URL) throws -> Data {
    let data = try Data(contentsOf: url)
    return data.prefix(16)
}
```

## Good

```swift
import Foundation

func firstBytes(of url: URL) throws -> Data {
    let data = try Data(contentsOf: url, options: .mappedIfSafe)
    return data.prefix(16)
}
```

## See Also

- [swift-io-filehandle-chunks](io-filehandle-chunks.md) - streaming a file that does not fit memory
- [swift-io-file-size](io-file-size.md) - checking the size before reading anything
