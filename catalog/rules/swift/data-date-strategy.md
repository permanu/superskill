---
id: swift-data-date-strategy
lang: swift
prefix: data
title: Decode dates with a strategy that matches the wire format
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [date, jsondecoder, iso8601]
  files: ["**/*.swift"]
related: [swift-data-key-strategy, swift-data-codable]
sources:
  - title: JSONDecoder.DateDecodingStrategy
    url: https://developer.apple.com/documentation/foundation/jsondecoder/datedecodingstrategy-swift.enum
---
> Decode dates with a strategy that matches the wire format.

## Why

Apple documents `JSONDecoder.DateDecodingStrategy` as the strategies available for formatting dates when decoding them from JSON, including `iso8601` for the ISO 8601 standard and epoch-based options. Decoding a date field as a `String` and parsing it later puts the format in application code and turns a wire-format change into scattered parse failures. Setting the strategy on the decoder keeps the format beside the other decoding configuration and yields `Date` values directly.

## Bad

```swift
struct Event: Decodable {
    var title: String
    var startsAt: String
}
```

## Good

```swift
import Foundation

struct Event: Decodable {
    var title: String
    var startsAt: Date
}

let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601
print(decoder.dateDecodingStrategy)
```

## See Also

- [swift-data-key-strategy](data-key-strategy.md) - the matching setting for keys
- [swift-data-codable](data-codable.md) - modeling the payload type
