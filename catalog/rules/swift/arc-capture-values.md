---
id: swift-arc-capture-values
lang: swift
prefix: arc
title: Capture a value in a capture list when the closure needs a snapshot
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [capture list, snapshot, closure, reference]
  files: ["**/*.swift"]
  symbols: [capture list]
related: [swift-arc-closure-capture, swift-conc-task-local]
sources:
  - title: The Swift Programming Language - Closures
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/
  - title: The Swift Programming Language - Automatic Reference Counting
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/
---
> Use a capture list to copy a value at closure creation when later writes should not be visible.

## Why

The Swift book states that capturing by reference keeps a captured variable alive and shared, so writes performed after the closure is created are visible when it runs. That sharing is correct for counters and caches but wrong for a snapshot such as a message or identifier that should not change. A capture list entry copies the current value into a new constant at the point the closure is created.

## Bad

```swift
func makePrinter() -> (() -> Void, String) {
    var message = "start"
    let printer = { print(message) }
    message = "finish"
    return (printer, message)
}
```

## Good

```swift
func makePrinter() -> (() -> Void, String) {
    var message = "start"
    let printer = { [message] in print(message) }
    message = "finish"
    return (printer, message)
}
```

## See Also

- [swift-arc-closure-capture](arc-closure-capture.md) - capture lists that manage object lifetimes
- [swift-conc-task-local](conc-task-local.md) - context that should follow a task instead of being captured
