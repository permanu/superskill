---
id: swift-ui-appstorage
lang: swift
prefix: ui
title: Persist simple preferences with AppStorage
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [appstorage, userdefaults, preference]
  files: ["**/*.swift"]
related: [swift-ui-state-ownership, swift-ui-binding-child]
sources:
  - title: AppStorage
    url: https://developer.apple.com/documentation/swiftui/appstorage
---
> Persist simple preferences with `AppStorage` instead of `State`.

## Why

Apple documents `AppStorage` as a property wrapper type that reflects a value from `UserDefaults` and invalidates a view on a change in value in that user default. `State` storage is tied to the view's lifetime: when the view is recreated from scratch or the app relaunches, the value starts over. A preference that must survive the session belongs in user defaults, and `AppStorage` reads and writes it while keeping the view updated.

## Bad

```swift
import SwiftUI

struct SettingsView: View {
    @State private var useDarkMode = false

    var body: some View {
        Toggle("Dark Mode", isOn: $useDarkMode)
    }
}
```

## Good

```swift
import SwiftUI

struct SettingsView: View {
    @AppStorage("useDarkMode") private var useDarkMode = false

    var body: some View {
        Toggle("Dark Mode", isOn: $useDarkMode)
    }
}
```

## See Also

- [swift-ui-state-ownership](ui-state-ownership.md) - view-local values that reset with the view
- [swift-ui-binding-child](ui-binding-child.md) - handing the stored value to controls
