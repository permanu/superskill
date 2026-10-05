---
id: swift-arc-closure-capture
lang: swift
prefix: arc
title: Use a weak capture to break the cycle between an object and its stored closure
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [capture list, weak self, retain cycle, closure]
  files: ["**/*.swift"]
  symbols: [weak, self]
related: [swift-arc-weak-cycle, swift-arc-task-capture]
sources:
  - title: The Swift Programming Language - Automatic Reference Counting
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/
  - title: The Swift Programming Language - Closures
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/
---
> Capture `self` weakly in a closure stored on the object so the object can deallocate.

## Why

The Swift book describes the cycle directly: assigning a closure to a property of a class instance, where the closure's body captures that instance, creates a strong reference cycle between the closure and the instance. Because the instance retains the closure and the closure retains the instance, neither reference count reaches zero. A capture list with `[weak self]` breaks the closure's strong reference while leaving the object usable through an optional check.

## Bad

```swift
final class Downloader {
    var progress: Int = 0
    var onProgress: (() -> Void)?

    func observe() {
        onProgress = {
            print(self.progress)
        }
    }
}
```

## Good

```swift
final class Downloader {
    var progress: Int = 0
    var onProgress: (() -> Void)?

    func observe() {
        onProgress = { [weak self] in
            guard let self else { return }
            print(self.progress)
        }
    }
}
```

## See Also

- [swift-arc-weak-cycle](arc-weak-cycle.md) - cycles formed by properties instead of closures
- [swift-arc-task-capture](arc-task-capture.md) - the async-task form of the same capture
