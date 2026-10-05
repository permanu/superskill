---
id: swift-net-upload-file
lang: swift
prefix: net
title: Upload large bodies from a file
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [upload, fromfile, request body]
  files: ["**/*.swift"]
related: [swift-net-async-data, swift-io-filehandle-chunks]
sources:
  - title: URLSession.upload(for:fromFile:)
    url: https://developer.apple.com/documentation/foundation/urlsession/upload(for:fromfile:)
---
> Upload a large body from a file instead of loading it into the request.

## Why

Apple documents `upload(for:fromFile:)` as a convenience method that uploads data using a `URLRequest`, creates and resumes a `URLSessionUploadTask` internally, and takes the file to upload as a URL. Setting `httpBody` instead requires reading the whole file into memory before the request can start, so a large upload holds its full size in the app's address space. The file-based upload task reads the body from disk as the transfer proceeds.

## Bad

```swift
import Foundation

func upload(fileAt url: URL, request: URLRequest) async throws -> Data {
    var request = request
    request.httpBody = try Data(contentsOf: url)
    let (data, _) = try await URLSession.shared.data(for: request)
    return data
}
```

## Good

```swift
import Foundation

func upload(fileAt url: URL, request: URLRequest) async throws -> Data {
    let (data, _) = try await URLSession.shared.upload(for: request, fromFile: url)
    return data
}
```

## See Also

- [swift-net-async-data](net-async-data.md) - the download-side convenience methods
- [swift-io-filehandle-chunks](io-filehandle-chunks.md) - streaming file contents in general
