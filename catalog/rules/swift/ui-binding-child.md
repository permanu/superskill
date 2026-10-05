---
id: swift-ui-binding-child
lang: swift
prefix: ui
title: Pass a Binding when a subview must change the value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [binding, subview, swiftui]
  files: ["**/*.swift"]
related: [swift-ui-state-ownership, swift-ui-observable]
sources:
  - title: State
    url: https://developer.apple.com/documentation/swiftui/state
  - title: Binding
    url: https://developer.apple.com/documentation/swiftui/binding
---
> Pass a `Binding` when a subview must change the value.

## Why

Apple's `State` documentation describes sharing: if you pass a state property to a subview, SwiftUI updates the subview any time the value changes in the container view, but the subview cannot modify the value; to enable the subview to modify the state's stored value, pass a `Binding` instead, which you get by prefixing the state property name with a dollar sign. Apple documents `Binding` as the property wrapper that can read and write a value owned by a source of truth. A callback that mutates the parent's state keeps the ownership in one place only by accident.

## Bad

```swift
import SwiftUI

struct PlayButton: View {
    var isPlaying: Bool
    var toggle: () -> Void

    var body: some View {
        Button(isPlaying ? "Pause" : "Play", action: toggle)
    }
}
```

## Good

```swift
import SwiftUI

struct PlayButton: View {
    @Binding var isPlaying: Bool

    var body: some View {
        Button(isPlaying ? "Pause" : "Play") {
            isPlaying.toggle()
        }
    }
}
```

## See Also

- [swift-ui-state-ownership](ui-state-ownership.md) - creating the state that owns the value
- [swift-ui-observable](ui-observable.md) - bindings into observable models
