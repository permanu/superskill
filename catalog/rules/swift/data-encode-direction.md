---
id: swift-data-encode-direction
lang: swift
prefix: data
title: Declare only the coding direction the type needs
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [encodable, decodable, codable]
  files: ["**/*.swift"]
related: [swift-data-codable, swift-data-manual-coding]
sources:
  - title: Encoding and Decoding Custom Types
    url: https://developer.apple.com/documentation/foundation/encoding-and-decoding-custom-types
---
> Declare only the coding direction the type needs.

## Why

The "Encoding and Decoding Custom Types" article notes that some apps only need to encode requests or only need to decode responses, and documents declaring `Encodable` when only encoding is needed and `Decodable` when only decoding is needed. `Codable` promises both directions, so every stored property must stay decodable and encodable even when one side never runs; the narrower conformance states the real contract and lets the unused direction evolve freely.

## Bad

```swift
struct WeatherResponse: Codable {
    var temperature: Double
}
```

## Good

```swift
struct WeatherResponse: Decodable {
    var temperature: Double
}
```

## See Also

- [swift-data-codable](data-codable.md) - modeling payloads with codable types
- [swift-data-manual-coding](data-manual-coding.md) - when the synthesized direction is not enough
