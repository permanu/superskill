---
id: swift-arc-deinit-release
lang: swift
prefix: arc
title: Release resources owned by a class in its deinitializer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deinit, cleanup, resource, file descriptor]
  files: ["**/*.swift"]
  symbols: [deinit]
related: [swift-arc-noncopyable, swift-err-defer-cleanup]
sources:
  - title: The Swift Programming Language - Deinitialization
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/deinitialization/
---
> Close the resources a class opens in `deinit` so cleanup follows the object's lifetime.

## Why

The Swift book states that when you work with your own resources you need to perform cleanup yourself, using a file that must be closed before the instance is deallocated as the example. A deinitializer is called immediately before deallocation and can access the instance's properties, which is exactly where the matching close belongs. Leaving the release out of the class means every exit path that drops the object leaks the resource.

## Bad

```swift
final class FileWriter {
    private var descriptor: Int32 = 0

    func open(path: String) {
        descriptor = 1
    }

    func write(_ text: String) {
        descriptor += 1
    }
}
```

## Good

```swift
final class FileWriter {
    private var descriptor: Int32 = 0

    func open(path: String) {
        descriptor = 1
    }

    func write(_ text: String) {
        descriptor += 1
    }

    func close() {
        descriptor = -1
    }

    deinit {
        close()
    }
}
```

## See Also

- [swift-arc-noncopyable](arc-noncopyable.md) - the value-type form that also gets a deinit
- [swift-err-defer-cleanup](err-defer-cleanup.md) - scope-based cleanup inside a function
