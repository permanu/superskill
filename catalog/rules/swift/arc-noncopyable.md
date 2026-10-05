---
id: swift-arc-noncopyable
lang: swift
prefix: arc
title: Model unique resources as noncopyable structs instead of classes
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [noncopyable, move-only, unique resource, deinit]
  files: ["**/*.swift"]
  symbols: ["~Copyable", deinit]
related: [swift-arc-deinit-release, swift-arc-borrowing-consuming]
sources:
  - title: Swift Evolution SE-0390 - Noncopyable structs and enums
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0390-noncopyable-structs-and-enums.md
---
> Give a unique resource its own noncopyable struct with a deinitializer.

## Why

SE-0390 observes that copyable structs and enums model unique resources poorly, while classes impose heap allocation and reference counting because their references are shared and copyable. A `~Copyable` struct has unique ownership, cannot be copied by the implicit copy mechanism, and may declare a `deinit` that runs at the end of the value's lifetime. The result keeps managed cleanup without the object overhead or accidental aliasing.

## Bad

```swift
final class FileDescriptor {
    let descriptor: Int32

    init(descriptor: Int32) {
        self.descriptor = descriptor
    }

    deinit {
        print("closing \(descriptor)")
    }
}
```

## Good

```swift
struct FileDescriptor: ~Copyable {
    let descriptor: Int32

    init(descriptor: Int32) {
        self.descriptor = descriptor
    }

    deinit {
        print("closing \(descriptor)")
    }
}
```

## See Also

- [swift-arc-deinit-release](arc-deinit-release.md) - cleanup on the class form
- [swift-arc-borrowing-consuming](arc-borrowing-consuming.md) - declaring how noncopyable values pass
