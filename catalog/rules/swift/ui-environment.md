---
id: swift-ui-environment
lang: swift
prefix: ui
title: Read hierarchy values through the environment
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [environment, color scheme, swiftui]
  files: ["**/*.swift"]
related: [swift-ui-semantic-color, swift-ui-observable]
sources:
  - title: Environment
    url: https://developer.apple.com/documentation/swiftui/environment
---
> Read values that SwiftUI supplies per view hierarchy through the environment.

## Why

Apple documents `Environment` as the property wrapper that reads a value from a view's environment, selected with an `EnvironmentValues` key path. SwiftUI supplies those values per view hierarchy, including system settings like the color scheme and values you set with the `environment` modifier, and reading them through the wrapper keeps a view tied to the values that apply where it is displayed. A stored property initialized once captures a single value and cannot react to the hierarchy the view is placed in.

## Bad

```swift
import SwiftUI

struct ThemeView: View {
    var colorScheme: ColorScheme = .light

    var body: some View {
        Text(colorScheme == .dark ? "Dark" : "Light")
    }
}
```

## Good

```swift
import SwiftUI

struct ThemeView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Text(colorScheme == .dark ? "Dark" : "Light")
    }
}
```

## See Also

- [swift-ui-semantic-color](ui-semantic-color.md) - colors that resolve against the environment
- [swift-ui-observable](ui-observable.md) - models shared through the environment
