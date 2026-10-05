---
id: swift-ui-animation-value
lang: swift
prefix: ui
title: Scope animations to the value that changes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [animation value, swiftui, animation]
  files: ["**/*.swift"]
related: [swift-ui-with-animation, swift-ui-semantic-color]
sources:
  - title: View.animation(_:value:)
    url: https://developer.apple.com/documentation/swiftui/view/animation(_:value:)
  - title: View.animation(_:)
    url: https://developer.apple.com/documentation/swiftui/view/animation(_:)
---
> Apply an animation to a specific value instead of the whole view.

## Why

Apple documents `animation(_:value:)` as applying the given animation to this view when the specified value changes. The no-value overload applies its animation whenever the view changes, so it cannot distinguish the update you meant to animate from any other update that reaches the same view. Naming the value scopes the animation to changes of that value and leaves other updates alone.

## Bad

```swift
import SwiftUI

struct ProgressView: View {
    var progress: Double

    var body: some View {
        Text("\(progress)")
            .animation(.default)
    }
}
```

## Good

```swift
import SwiftUI

struct ProgressView: View {
    var progress: Double

    var body: some View {
        Text("\(progress)")
            .animation(.default, value: progress)
    }
}
```

## See Also

- [swift-ui-with-animation](ui-with-animation.md) - animating a mutation at its source
- [swift-ui-transition](ui-transition.md) - animation for a view that appears or disappears
