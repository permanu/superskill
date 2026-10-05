---
id: swift-ui-lazy-stack
lang: swift
prefix: ui
title: Use lazy stacks for long scrollable content
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lazyvstack, scrollview, performance]
  files: ["**/*.swift"]
related: [swift-ui-list-id, swift-ui-foreach-constant-count]
sources:
  - title: LazyVStack
    url: https://developer.apple.com/documentation/swiftui/lazyvstack
---
> Use `LazyVStack` instead of `VStack` for long scrollable content.

## Why

Apple documents `LazyVStack` as a view that arranges its children in a line that grows vertically, creating items only as needed. A `VStack` carries no such guarantee, so a long list inside a scroll view pays for every row up front even though most rows are never seen. The lazy container defers each child until the scroll position approaches it.

## Bad

```swift
import SwiftUI

struct RowList: View {
    var body: some View {
        ScrollView {
            VStack {
                ForEach(1...100, id: \.self) { index in
                    Text("Row \(index)")
                }
            }
        }
    }
}
```

## Good

```swift
import SwiftUI

struct RowList: View {
    var body: some View {
        ScrollView {
            LazyVStack {
                ForEach(1...100, id: \.self) { index in
                    Text("Row \(index)")
                }
            }
        }
    }
}
```

## See Also

- [swift-ui-list-id](ui-list-id.md) - identity that keeps rows stable while scrolling
- [swift-ui-foreach-constant-count](ui-foreach-constant-count.md) - one view per element for maximal laziness
