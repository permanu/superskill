---
id: swift-ui-with-animation
lang: swift
prefix: ui
title: Animate state changes with withAnimation
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [withanimation, animation, transaction]
  files: ["**/*.swift"]
related: [swift-ui-animation-value, swift-ui-transition]
sources:
  - title: withAnimation(_:_:)
    url: https://developer.apple.com/documentation/swiftui/withanimation(_:_:)
---
> Animate a state change by wrapping the mutation in `withAnimation`.

## Why

Apple documents `withAnimation` as returning the result of recomputing the view's body with the provided animation, setting that animation on the current transaction. A mutation made outside an animated transaction recomputes the affected views immediately, so a value that should glide to its new state jumps instead. Wrapping the mutation gives every view affected by that change an animation to interpolate with.

## Bad

```swift
import SwiftUI

struct ToggleView: View {
    @State private var isActive = false

    var body: some View {
        Button("Toggle") {
            isActive.toggle()
        }
        .scaleEffect(isActive ? 1.5 : 1.0)
    }
}
```

## Good

```swift
import SwiftUI

struct ToggleView: View {
    @State private var isActive = false

    var body: some View {
        Button("Toggle") {
            withAnimation {
                isActive.toggle()
            }
        }
        .scaleEffect(isActive ? 1.5 : 1.0)
    }
}
```

## See Also

- [swift-ui-animation-value](ui-animation-value.md) - scoping an animation to one value
- [swift-ui-transition](ui-transition.md) - animating insertion and removal
