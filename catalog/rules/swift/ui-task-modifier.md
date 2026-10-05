---
id: swift-ui-task-modifier
lang: swift
prefix: ui
title: Run view lifecycle work in the task modifier
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task modifier, onappear, cancellation]
  files: ["**/*.swift"]
related: [swift-ui-state-ownership, swift-async-task-handle]
sources:
  - title: View.task(name:priority:file:line:_:)
    url: https://developer.apple.com/documentation/swiftui/view/task(name:priority:file:line:_:)
---
> Run view lifecycle work in the `task` modifier instead of `onAppear` and a `Task`.

## Why

Apple documents the `task` modifier as adding an asynchronous task to perform before the view appears, with a lifetime that matches the modified view: if the task does not finish before SwiftUI removes the view or the view changes identity, SwiftUI cancels the task. A `Task` created inside `onAppear` has no such lifetime, so work started there keeps running after the view is gone unless the app cancels it by hand. The modifier also runs the action when the view's identity changes.

## Bad

```swift
import SwiftUI

struct ContentView: View {
    @State private var message = "Loading..."

    var body: some View {
        Text(message)
            .onAppear {
                Task {
                    message = "Loaded"
                }
            }
    }
}
```

## Good

```swift
import SwiftUI

struct ContentView: View {
    @State private var message = "Loading..."

    var body: some View {
        Text(message)
            .task {
                message = "Loaded"
            }
    }
}
```

## See Also

- [swift-ui-state-ownership](ui-state-ownership.md) - the state the task updates
- [swift-async-task-handle](async-task-handle.md) - unstructured tasks that outlive a view
