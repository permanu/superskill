---
id: swift-data-coding-keys
lang: swift
prefix: data
title: Omit CodingKeys when property names already match the format
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [codingkeys, codable, synthesis]
  files: ["**/*.swift"]
related: [swift-data-key-strategy, swift-data-manual-coding]
sources:
  - title: Encoding and Decoding Custom Types
    url: https://developer.apple.com/documentation/foundation/encoding-and-decoding-custom-types
---
> Omit `CodingKeys` when the property names already match the format.

## Why

The "Encoding and Decoding Custom Types" article states that adding `Codable` to a type whose properties are already codable triggers an automatic conformance that satisfies the protocol requirements, and that a `CodingKeys` enumeration serves as the authoritative list of properties included in coding. An enumeration that merely repeats matching property names adds a second list to keep in sync; forgetting to add a new property to it silently drops that property from the payload.

## Bad

```swift
struct Landmark: Codable {
    var name: String
    var foundingYear: Int

    enum CodingKeys: String, CodingKey {
        case name
        case foundingYear
    }
}
```

## Good

```swift
struct Landmark: Codable {
    var name: String
    var foundingYear: Int
}
```

## See Also

- [swift-data-key-strategy](data-key-strategy.md) - renaming keys for a foreign naming style
- [swift-data-manual-coding](data-manual-coding.md) - writing coding logic by hand
