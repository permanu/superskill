---
id: swift-ui-accessibility-label
lang: swift
prefix: ui
title: Label controls that show only an icon
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [accessibility, label, icon]
  files: ["**/*.swift"]
related: [swift-ui-decorative-image]
sources:
  - title: View.accessibilityLabel(_:)
    url: https://developer.apple.com/documentation/swiftui/view/accessibilitylabel(_:)
---
> Give an icon-only control an accessibility label.

## Why

Apple documents `accessibilityLabel(_:)` as adding a label to the view that describes its contents, and describes the method as the way to provide a label for a view that doesn't display text, like an icon. An icon-only button has no text for assistive technologies to read, so the control is encountered without a name. The label supplies the name without changing what is drawn.

## Bad

```swift
import SwiftUI

struct PlayerView: View {
    var body: some View {
        Button {
            play()
        } label: {
            Image(systemName: "play.fill")
        }
    }

    func play() {}
}
```

## Good

```swift
import SwiftUI

struct PlayerView: View {
    var body: some View {
        Button {
            play()
        } label: {
            Image(systemName: "play.fill")
        }
        .accessibilityLabel("Play")
    }

    func play() {}
}
```

## See Also

- [swift-ui-decorative-image](ui-decorative-image.md) - hiding images that convey nothing
