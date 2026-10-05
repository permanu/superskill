---
id: swift-ui-semantic-font
lang: swift
prefix: ui
title: Use text styles instead of fixed point sizes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [font, text style, typography]
  files: ["**/*.swift"]
related: [swift-ui-semantic-color, swift-ui-environment]
sources:
  - title: Font
    url: https://developer.apple.com/documentation/swiftui/font
---
> Use a text style such as `.title` instead of a fixed point size.

## Why

Apple documents `Font` as an environment-dependent font and notes that the system resolves a font's value at the time it uses the font in a given environment because `Font` is a late-binding token. A text style is resolved against the environment where the text is used, so it can reflect that context. A fixed point size baked into the view is not environment-dependent and renders the same value everywhere.

## Bad

```swift
import SwiftUI

struct TitleView: View {
    var body: some View {
        Text("Title")
            .font(.system(size: 24))
    }
}
```

## Good

```swift
import SwiftUI

struct TitleView: View {
    var body: some View {
        Text("Title")
            .font(.title)
    }
}
```

## See Also

- [swift-ui-semantic-color](ui-semantic-color.md) - colors that resolve against the environment
- [swift-ui-environment](ui-environment.md) - reading the surrounding context
