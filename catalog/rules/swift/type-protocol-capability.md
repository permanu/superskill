---
id: swift-type-protocol-capability
lang: swift
prefix: type
title: Name capability protocols with able, ible, or ing suffixes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [protocol naming, capability, naming]
  files: ["**/*.swift"]
  symbols: [protocol]
related: [swift-type-opaque-return, swift-type-generic-constraints]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Name a protocol that describes a capability with an able, ible, or ing suffix.

## Why

The API Design Guidelines separate protocols that describe what something is, which read as nouns, from protocols that describe a capability, which take the suffixes able, ible, or ing. A capability named like a noun reads at the conformance site as an identity claim, and the two categories become indistinguishable in a signature. The suffix keeps the conformance phrase grammatical: a type that can cache is Caching.

## Bad

```swift
protocol Cache {
    func lookup(_ key: String) -> String?
}

final class DiskCache: Cache {
    func lookup(_ key: String) -> String? { nil }
}
```

## Good

```swift
protocol Caching {
    func lookup(_ key: String) -> String?
}

final class DiskCache: Caching {
    func lookup(_ key: String) -> String? { nil }
}
```

## See Also

- [swift-type-opaque-return](type-opaque-return.md) - exposing the capability without the concrete type
- [swift-type-generic-constraints](type-generic-constraints.md) - constraining generics to the capability
