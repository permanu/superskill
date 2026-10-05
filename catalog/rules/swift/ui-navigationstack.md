---
id: swift-ui-navigationstack
lang: swift
prefix: ui
title: Build navigation hierarchies with NavigationStack
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [navigationstack, navigationview, navigation]
  files: ["**/*.swift"]
related: [swift-ui-state-ownership, swift-ui-lazy-stack]
sources:
  - title: NavigationStack
    url: https://developer.apple.com/documentation/swiftui/navigationstack
  - title: Migrating to new navigation types
    url: https://developer.apple.com/documentation/swiftui/migrating-to-new-navigation-types
---
> Build navigation hierarchies with `NavigationStack` instead of `NavigationView`.

## Why

Apple's migration article describes improving navigation behavior by replacing navigation views with navigation stacks and navigation split views. The `NavigationStack` documentation describes the stack as a view that displays a root view and enables you to present additional views over the root view. `NavigationView` is the older container that the migration guidance replaces, so a new hierarchy built on it starts out on the deprecated path.

## Bad

```swift
import SwiftUI

struct RootView: View {
    var body: some View {
        NavigationView {
            Text("Root")
        }
    }
}
```

## Good

```swift
import SwiftUI

struct RootView: View {
    var body: some View {
        NavigationStack {
            Text("Root")
        }
    }
}
```

## See Also

- [swift-ui-state-ownership](ui-state-ownership.md) - state that drives navigation destinations
- [swift-ui-lazy-stack](ui-lazy-stack.md) - lazy containers for the content inside the stack
