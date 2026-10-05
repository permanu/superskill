---
id: swift-data-key-strategy
lang: swift
prefix: data
title: Map a pervasive foreign key style with the decoder strategy
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [snake case, key decoding strategy, codable]
  files: ["**/*.swift"]
related: [swift-data-coding-keys, swift-data-manual-coding]
sources:
  - title: JSONDecoder.KeyDecodingStrategy
    url: https://developer.apple.com/documentation/foundation/jsondecoder/keydecodingstrategy-swift.enum
---
> Map a pervasive foreign key style with the decoder's key strategy.

## Why

Apple documents `JSONDecoder.KeyDecodingStrategy.convertFromSnakeCase` as the key decoding strategy that converts snake-case keys to camel-case keys, and the enum as the values that determine how a type's coding keys are decoded from JSON keys. When a service uses snake_case throughout, a `CodingKeys` enumeration in every type repeats the same mechanical rename; one `keyDecodingStrategy` setting applies it to all of them. The documentation notes that non-default strategies may inspect and transform each key at a performance cost, so the setting suits a pervasive style rather than one isolated rename.

## Bad

```swift
struct User: Codable {
    var firstName: String
    var lastName: String

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
    }
}
```

## Good

```swift
import Foundation

struct User: Codable {
    var firstName: String
    var lastName: String
}

let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase
print(decoder.keyDecodingStrategy)
```

## See Also

- [swift-data-coding-keys](data-coding-keys.md) - keeping CodingKeys for isolated renames
- [swift-data-manual-coding](data-manual-coding.md) - when neither mapping is enough
