---
id: swift-ui-list-id
lang: swift
prefix: ui
title: Let list elements conform to Identifiable
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [foreach, identifiable, identity]
  files: ["**/*.swift"]
related: [swift-ui-foreach-constant-count, swift-ui-lazy-stack]
sources:
  - title: ForEach
    url: https://developer.apple.com/documentation/swiftui/foreach
---
> Let list elements conform to `Identifiable` instead of supplying an ad-hoc id.

## Why

Apple documents `ForEach` as computing views on demand from an underlying collection of identified data: either the collection's elements conform to `Identifiable`, or you provide an `id` parameter to the initializer. Conforming the element type states its identity once, and every list, outline, and other identified container uses the same stable value. An `id` key path chosen per call site can name a property that changes, giving the same element a new identity in one list and not another.

## Bad

```swift
import SwiftUI

struct Item: Identifiable {
    let id = UUID()
    let name: String
}

struct ItemList: View {
    let items: [Item]

    var body: some View {
        List {
            ForEach(items, id: \.name) { item in
                Text(item.name)
            }
        }
    }
}
```

## Good

```swift
import SwiftUI

struct Item: Identifiable {
    let id = UUID()
    let name: String
}

struct ItemList: View {
    let items: [Item]

    var body: some View {
        List {
            ForEach(items) { item in
                Text(item.name)
            }
        }
    }
}
```

## See Also

- [swift-ui-foreach-constant-count](ui-foreach-constant-count.md) - keeping each element's view count constant
- [swift-ui-lazy-stack](ui-lazy-stack.md) - the lazy container that uses the identity
