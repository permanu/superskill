---
id: swift-ui-foreach-constant-count
lang: swift
prefix: ui
title: Give each list element a constant number of views
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [foreach, list, lazy]
  files: ["**/*.swift"]
related: [swift-ui-list-id, swift-ui-lazy-stack]
sources:
  - title: ForEach
    url: https://developer.apple.com/documentation/swiftui/foreach
---
> Make every element of a lazy list produce the same number of views.

## Why

Apple's `ForEach` documentation notes that containers like `List` and `LazyVStack` query their elements lazily, and that maximal performance comes from ensuring the view created from each element represents a constant number of views. An `if` statement without an `else` is the example the documentation calls out: each element can represent either 1 or 0 views, a non-constant number. Wrapping the condition in a `Group` makes every element produce exactly one view.

## Bad

```swift
import SwiftUI

struct Item: Identifiable {
    let id = UUID()
    let name: String
    let isFavorite: Bool
}

struct RowList: View {
    let items: [Item]

    var body: some View {
        List(items) { item in
            if item.isFavorite {
                Label(item.name, systemImage: "star")
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
    let isFavorite: Bool
}

struct RowList: View {
    let items: [Item]

    var body: some View {
        List(items) { item in
            Group {
                if item.isFavorite {
                    Label(item.name, systemImage: "star")
                }
            }
        }
    }
}
```

## See Also

- [swift-ui-list-id](ui-list-id.md) - the identity each element is tracked by
- [swift-ui-lazy-stack](ui-lazy-stack.md) - the lazy container that benefits from this
