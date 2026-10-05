---
id: swift-data-manual-coding
lang: swift
prefix: data
title: Write coding logic by hand only when synthesis cannot express the format
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [init from, encode to, codable]
  files: ["**/*.swift"]
related: [swift-data-codable, swift-data-coding-keys]
sources:
  - title: Encoding and Decoding Custom Types
    url: https://developer.apple.com/documentation/foundation/encoding-and-decoding-custom-types
---
> Write `init(from:)` and `encode(to:)` only when synthesis cannot express the format.

## Why

The "Encoding and Decoding Custom Types" article introduces manual coding for the case where the structure of a Swift type differs from the structure of its encoded form, such as a property nested inside an additional container. A hand-written `init(from:)` that decodes each key into the same shape the compiler would synthesize adds code that must be updated with every property and can drift from the encoder's output. Plain `Codable` conformance covers the matching case.

## Bad

```swift
struct Point: Codable {
    var x: Int
    var y: Int

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        x = try container.decode(Int.self, forKey: .x)
        y = try container.decode(Int.self, forKey: .y)
    }
}
```

## Good

```swift
struct Point: Codable {
    var x: Int
    var y: Int
}
```

## See Also

- [swift-data-codable](data-codable.md) - the synthesized conformance
- [swift-data-coding-keys](data-coding-keys.md) - renaming keys without manual coding
