---
id: swift-ui-decorative-image
lang: swift
prefix: ui
title: Hide decorative images from accessibility
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [accessibility, decorative image, hidden]
  files: ["**/*.swift"]
related: [swift-ui-accessibility-label]
sources:
  - title: View.accessibilityHidden(_:)
    url: https://developer.apple.com/documentation/swiftui/view/accessibilityhidden(_:)
---
> Hide an image that conveys nothing from system accessibility features.

## Why

Apple documents `accessibilityHidden(_:)` as specifying whether to hide this view from system accessibility features. An image that is purely decorative carries no information, so leaving it exposed to accessibility adds an element that assistive technologies must skip past. Hiding it removes that element while the image stays on screen.

## Bad

```swift
import SwiftUI

struct BannerView: View {
    var body: some View {
        Image(systemName: "sparkles")
    }
}
```

## Good

```swift
import SwiftUI

struct BannerView: View {
    var body: some View {
        Image(systemName: "sparkles")
            .accessibilityHidden(true)
    }
}
```

## See Also

- [swift-ui-accessibility-label](ui-accessibility-label.md) - naming images that do convey meaning
