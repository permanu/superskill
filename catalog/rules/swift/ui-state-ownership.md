---
id: swift-ui-state-ownership
lang: swift
prefix: ui
title: Keep view-local mutable values in State
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [state, view state, swiftui]
  files: ["**/*.swift"]
related: [swift-ui-binding-child, swift-ui-observable]
sources:
  - title: State
    url: https://developer.apple.com/documentation/swiftui/state
---
> Keep view-local mutable values in `State` instead of plain stored properties.

## Why

Apple documents `State` as the property wrapper that reads and writes a value managed by SwiftUI: you use state as the single source of truth for a value stored in a view hierarchy, SwiftUI manages the storage, and when the value changes SwiftUI updates the parts of the view hierarchy that depend on it. It also says to declare state as private and to use it only for storage local to a view and its subviews. A plain stored property is copied into each view value and never triggers an update.

## Bad

```swift
import SwiftUI

struct PlayButton: View {
    let isPlaying = false

    var body: some View {
        Text(isPlaying ? "Pause" : "Play")
    }
}
```

## Good

```swift
import SwiftUI

struct PlayButton: View {
    @State private var isPlaying = false

    var body: some View {
        Button(isPlaying ? "Pause" : "Play") {
            isPlaying.toggle()
        }
    }
}
```

## See Also

- [swift-ui-binding-child](ui-binding-child.md) - sharing state with subviews
- [swift-ui-observable](ui-observable.md) - state for reference-type models
