---
id: swift-type-nested-namespacing
lang: swift
prefix: type
title: Nest supporting types instead of prefixing their names
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nested types, namespacing, naming]
  files: ["**/*.swift"]
  symbols: [nested, enum]
related: [swift-type-enum-state, swift-type-protocol-capability]
sources:
  - title: The Swift Programming Language - Nested Types
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/nestedtypes/
---
> Define helper types inside the type they support so their short names are qualified by context.

## Why

The Swift book presents nested types as the way to define enumerations, structures, and protocols within the type whose functionality they support, and notes that nesting keeps names deliberately short because the context qualifies them. A flat namespace forces every helper to repeat its owner's name as a prefix and leaves unrelated types free to collide with it. Nesting scopes the helper to its owner and makes the relationship visible at the declaration.

## Bad

```swift
enum InvoiceStatus {
    case paid, unpaid
}

enum InvoiceLineKind {
    case service, product
}
```

## Good

```swift
enum Invoice {
    enum Status {
        case paid, unpaid
    }

    enum LineKind {
        case service, product
    }
}
```

## See Also

- [swift-type-enum-state](type-enum-state.md) - the state enums that are usually nested this way
- [swift-type-protocol-capability](type-protocol-capability.md) - naming the capabilities a nested type adopts
