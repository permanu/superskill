---
id: swift-api-case-conventions
lang: swift
prefix: api
title: Follow Swift case conventions for types, members, and acronyms
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [camel case, acronym, naming, capitalization]
  files: ["**/*.swift"]
  symbols: [UpperCamelCase, lowerCamelCase]
related: [swift-api-omit-needless-words, swift-type-protocol-capability]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Use UpperCamelCase for types and lowerCamelCase for everything else, casing acronyms uniformly.

## Why

The API Design Guidelines require UpperCamelCase for type and protocol names and lowerCamelCase for all other declarations, with acronyms and initialisms uniformly up- or down-cased according to that convention. A property named `URL` violates the convention twice: it is capitalized like a type and breaks the acronym casing rule that the guidelines illustrate with `utf8Bytes` and `userSMTPServer`. Consistent casing is how readers tell types from values at a glance.

## Bad

```swift
struct networkRequest {
    var URL: String = ""
}
```

## Good

```swift
struct NetworkRequest {
    var url: String = ""
}
```

## See Also

- [swift-api-omit-needless-words](api-omit-needless-words.md) - what the name should say
- [swift-type-protocol-capability](type-protocol-capability.md) - naming the protocol side of the API
