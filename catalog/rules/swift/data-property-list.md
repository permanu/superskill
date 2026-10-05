---
id: swift-data-property-list
lang: swift
prefix: data
title: Encode property lists with PropertyListEncoder
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [property list, plist, encoder]
  files: ["**/*.swift"]
related: [swift-data-codable, swift-data-manual-coding]
sources:
  - title: PropertyListEncoder
    url: https://developer.apple.com/documentation/foundation/propertylistencoder
  - title: Encoding and Decoding Custom Types
    url: https://developer.apple.com/documentation/foundation/encoding-and-decoding-custom-types
---
> Encode property lists with `PropertyListEncoder` and codable types.

## Why

Apple documents `PropertyListEncoder` as an object that encodes instances of data types to a property list, and the "Encoding and Decoding Custom Types" article notes that a codable type can be encoded with either `PropertyListEncoder` or `JSONEncoder` without containing format-specific code. Handing a `[String: Any]` tree to `PropertyListSerialization` reintroduces untyped keys and runtime failures; the encoder works from the same `Codable` conformance used for the other formats.

## Bad

```swift
import Foundation

let settings: [String: Any] = ["theme": "dark"]
let data = try PropertyListSerialization.data(fromPropertyList: settings, format: .xml, options: 0)
print(data)
```

## Good

```swift
import Foundation

struct Settings: Codable {
    var theme: String
}

let settings = Settings(theme: "dark")
let data = try PropertyListEncoder().encode(settings)
print(data)
```

## See Also

- [swift-data-codable](data-codable.md) - modeling the payload type
- [swift-data-manual-coding](data-manual-coding.md) - when the encoded shape differs
