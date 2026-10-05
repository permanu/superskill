---
id: swift-ui-semantic-color
lang: swift
prefix: ui
title: Prefer semantic colors over fixed components
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [color, dark mode, appearance]
  files: ["**/*.swift"]
related: [swift-ui-semantic-font, swift-ui-environment]
sources:
  - title: Color
    url: https://developer.apple.com/documentation/swiftui/color
---
> Prefer a semantic color such as `.primary` over fixed RGB components.

## Why

Apple documents `Color` as a representation of a color that adapts to a given context, and notes that SwiftUI only resolves a color to a concrete value just before using it in a given environment. That is what enables a context-dependent appearance for system-defined colors and asset catalog colors, which can have distinct light and dark variants. A color built from fixed components has nothing to adapt, so it renders the same way in every appearance.

## Bad

```swift
import SwiftUI

struct LabelView: View {
    var body: some View {
        Text("Label")
            .foregroundStyle(Color(red: 0, green: 0, blue: 0))
    }
}
```

## Good

```swift
import SwiftUI

struct LabelView: View {
    var body: some View {
        Text("Label")
            .foregroundStyle(.primary)
    }
}
```

## See Also

- [swift-ui-semantic-font](ui-semantic-font.md) - environment-dependent fonts
- [swift-ui-environment](ui-environment.md) - the context colors resolve against
