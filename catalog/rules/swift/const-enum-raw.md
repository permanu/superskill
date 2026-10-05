---
id: swift-const-enum-raw
lang: swift
prefix: const
title: Represent a fixed set of named values as an enum
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, raw value, constants]
  files: ["**/*.swift"]
related: [swift-const-option-set, swift-const-namespace-enum]
sources:
  - title: The Swift Programming Language - Enumerations
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/
---
> Represent a fixed set of named values as an enum with raw values.

## Why

The Enumerations chapter documents raw values: an enumeration can store a raw value of a string, character, integer, or floating-point type, with each raw value unique within the declaration and constant across instances. A namespace of parallel string constants describes the same closed set, but the compiler cannot tell that the set is closed, so a typo or an unlisted value passes through as an ordinary string. The raw-value enum makes the set exhaustive and converts to its wire value on demand.

## Bad

```swift
enum HTTPMethod {
    static let get = "GET"
    static let post = "POST"
}

let method = HTTPMethod.get
print(method)
```

## Good

```swift
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
}

let method = HTTPMethod.get
print(method.rawValue)
```

## See Also

- [swift-const-option-set](const-option-set.md) - the combinable-flags counterpart
- [swift-const-namespace-enum](const-namespace-enum.md) - hosting constants on a caseless enum
