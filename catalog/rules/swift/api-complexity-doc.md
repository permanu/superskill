---
id: swift-api-complexity-doc
lang: swift
prefix: api
title: Document the complexity of a computed property that is not O(1)
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [complexity, documentation, computed property]
  files: ["**/*.swift"]
  symbols: [complexity]
related: [swift-api-prefer-methods, swift-type-access-control]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> State the complexity of any computed property whose cost is not constant.

## Why

The API Design Guidelines require documenting the complexity of computed properties that are not O(1), because people assume property access involves no significant computation from their stored-property mental model. A sorting property that looks like a field access gets called inside loops. The `- Complexity:` note warns the reader that the access has real cost and lets them hoist it.

## Bad

```swift
struct Inventory {
    var items: [String] = []

    var sortedItems: [String] {
        items.sorted()
    }
}
```

## Good

```swift
struct Inventory {
    var items: [String] = []

    /// Returns the items in sorted order.
    ///
    /// - Complexity: O(*n* log *n*), where *n* is the number of items.
    var sortedItems: [String] {
        items.sorted()
    }
}
```

## See Also

- [swift-api-prefer-methods](api-prefer-methods.md) - when expensive behavior should be a method
- [swift-type-access-control](type-access-control.md) - keeping the property's contract narrow
