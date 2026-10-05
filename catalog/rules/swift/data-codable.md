---
id: swift-data-codable
lang: swift
prefix: data
title: Model serialized data with Codable types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [codable, json, serialization]
  files: ["**/*.swift"]
related: [swift-data-property-list, swift-data-encode-direction]
sources:
  - title: Encoding and Decoding Custom Types
    url: https://developer.apple.com/documentation/foundation/encoding-and-decoding-custom-types
---
> Model serialized data with `Codable` types instead of untyped dictionaries.

## Why

Apple's "Encoding and Decoding Custom Types" article states that adopting `Encodable` and `Decodable` lets implementations of `Encoder` and `Decoder` take your data and encode or decode it to and from an external representation such as JSON or property list, and that a type whose properties are codable conforms automatically. A `[String: Any]` payload keeps the shape in the author's head: key typos and type mismatches surface at runtime, and no call site can see the schema.

## Bad

```swift
import Foundation

let user: [String: Any] = ["id": 1, "name": "Ada"]
let data = try JSONSerialization.data(withJSONObject: user)
print(data)
```

## Good

```swift
import Foundation

struct User: Codable {
    let id: Int
    let name: String
}

let user = User(id: 1, name: "Ada")
let data = try JSONEncoder().encode(user)
print(data)
```

## See Also

- [swift-data-property-list](data-property-list.md) - the same approach for property lists
- [swift-data-encode-direction](data-encode-direction.md) - declaring only the direction you need
