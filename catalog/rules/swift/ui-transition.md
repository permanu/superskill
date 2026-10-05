---
id: swift-ui-transition
lang: swift
prefix: ui
title: Attach transitions to the view that appears
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [transition, insertion, removal]
  files: ["**/*.swift"]
related: [swift-ui-with-animation, swift-ui-animation-value]
sources:
  - title: View.transition(_:)
    url: https://developer.apple.com/documentation/swiftui/view/transition(_:)
---
> Attach a transition to the view that is inserted or removed, not its container.

## Why

Apple documents `transition(_:)` as associating a transition with the view: when this view appears or disappears, the transition is applied to it. A transition attached to a container that stays in the hierarchy has nothing to animate, because the container never appears or disappears — the conditional child inside it does. Attaching the transition to the child that enters and leaves gives the insertion and removal an animation to run.

## Bad

```swift
import SwiftUI

struct PanelView: View {
    @State private var isVisible = true

    var body: some View {
        VStack {
            if isVisible {
                Text("Panel")
            }
            Button("Toggle") {
                withAnimation {
                    isVisible.toggle()
                }
            }
        }
        .transition(.slide)
    }
}
```

## Good

```swift
import SwiftUI

struct PanelView: View {
    @State private var isVisible = true

    var body: some View {
        VStack {
            if isVisible {
                Text("Panel")
                    .transition(.slide)
            }
            Button("Toggle") {
                withAnimation {
                    isVisible.toggle()
                }
            }
        }
    }
}
```

## See Also

- [swift-ui-with-animation](ui-with-animation.md) - the animated transaction the transition runs in
- [swift-ui-animation-value](ui-animation-value.md) - scoping animation to a single value
