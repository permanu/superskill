---
id: swift-data-sorted-keys
lang: swift
prefix: data
title: Sort JSON keys when the output is compared or stored
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sortedkeys, json, deterministic]
  files: ["**/*.swift"]
related: [swift-data-codable, swift-data-property-list]
sources:
  - title: JSONEncoder.OutputFormatting.sortedKeys
    url: https://developer.apple.com/documentation/foundation/jsonencoder/outputformatting-swift.struct/sortedkeys
  - title: JSONEncoder.OutputFormatting
    url: https://developer.apple.com/documentation/foundation/jsonencoder/outputformatting-swift.struct
---
> Sort JSON keys when the output is compared or stored.

## Why

Apple documents the `sortedKeys` output formatting option as sorting keys in lexicographic order, within an `OutputFormatting` type that determines the readability, size, and element order of an encoded JSON object. JSON objects carry no key order, so unsorted output can differ between encodes of equal values, and a diff, snapshot, or checksum over that output reports changes that are not there. Sorting the keys makes the serialized form stable.

## Bad

```swift
import Foundation

struct Config: Codable {
    var name: String
    var size: Int
}

let data = try JSONEncoder().encode(Config(name: "main", size: 3))
print(data)
```

## Good

```swift
import Foundation

struct Config: Codable {
    var name: String
    var size: Int
}

let encoder = JSONEncoder()
encoder.outputFormatting = .sortedKeys
let data = try encoder.encode(Config(name: "main", size: 3))
print(data)
```

## See Also

- [swift-data-codable](data-codable.md) - modeling the encoded type
- [swift-data-property-list](data-property-list.md) - the same types in another format
