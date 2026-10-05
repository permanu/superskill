---
id: swift-ui-observable
lang: swift
prefix: ui
title: Track model changes with the Observable macro
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [observable, observation, model]
  files: ["**/*.swift"]
related: [swift-ui-state-ownership, swift-ui-environment]
sources:
  - title: Observable()
    url: https://developer.apple.com/documentation/observation/observable()
  - title: State
    url: https://developer.apple.com/documentation/swiftui/state
---
> Track model changes with the `@Observable` macro instead of `ObservableObject`.

## Why

Apple documents the `Observable()` macro as adding observation support to a custom type and conforming it to the `Observable` protocol. The `State` documentation notes that an object conforming to `ObservableObject` stored in a state property updates the view only when the reference to the object changes, not when its published properties change, and directs you to a different property wrapper for that case. The macro makes the type itself observable, so a view that reads an observable property updates when that property changes.

## Bad

```swift
import Combine
import Foundation

final class Library: NSObject, ObservableObject {
    @Published var name = "My library"
}
```

## Good

```swift
import Observation

@Observable
final class Library {
    var name = "My library"
}
```

## See Also

- [swift-ui-state-ownership](ui-state-ownership.md) - storing the model in view state
- [swift-ui-environment](ui-environment.md) - sharing the model through the environment
