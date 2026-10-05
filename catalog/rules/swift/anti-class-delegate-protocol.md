---
id: swift-anti-class-delegate-protocol
lang: swift
prefix: anti
title: Make delegate protocols class-bound so delegates can be weak
severity: should
enforce: tool
tool: swiftlint:class_delegate_protocol
baseline: latest
status: verified
triggers:
  keywords: [delegate, protocol, weak]
  files: ["**/*.swift"]
related: [swift-arc-weak-cycle, swift-arc-weak-consumption]
sources:
  - title: SwiftLint - class_delegate_protocol
    url: https://realm.github.io/SwiftLint/class_delegate_protocol.html
---
> Make delegate protocols class-bound so delegates can be weak.

## Why

SwiftLint's `class_delegate_protocol` rule states that delegate protocols should be class-only so they can be weakly referenced, and it is enabled by default. The `weak` modifier only applies to class types, so a value-type delegate cannot be held weakly and the owner keeps a strong reference to it. Declaring the protocol with `AnyObject` allows the delegate property to be weak and breaks the ownership loop before it forms.

## Bad

```swift
protocol DownloadDelegate {
    func downloadDidFinish()
}

final class Downloader {
    var delegate: (any DownloadDelegate)?
}
```

## Good

```swift
protocol DownloadDelegate: AnyObject {
    func downloadDidFinish()
}

final class Downloader {
    weak var delegate: (any DownloadDelegate)?
}
```

## See Also

- [swift-arc-weak-cycle](arc-weak-cycle.md) - breaking strong reference cycles with weak references
- [swift-arc-weak-consumption](arc-weak-consumption.md) - why a weak delegate reads as an Optional
