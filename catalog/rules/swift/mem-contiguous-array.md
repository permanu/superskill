---
id: swift-mem-contiguous-array
lang: swift
prefix: mem
title: Use ContiguousArray for class-element arrays that never bridge to Objective-C
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [contiguousarray, array, bridging, storage]
  files: ["**/*.swift"]
  symbols: [ContiguousArray]
related: [swift-mem-reserve-known, swift-mem-slice-storage]
sources:
  - title: ContiguousArray
    url: https://developer.apple.com/documentation/swift/contiguousarray
---
> Choose `ContiguousArray` when element types are classes and no Objective-C bridging is needed.

## Why

Apple documents that `Array` can store its elements either in a contiguous region or in an `NSArray` instance when the element type is a class or `@objc` protocol, while `ContiguousArray` always stores elements in a contiguous region. When such an array never crosses into Objective-C, that bridging possibility is pure overhead and makes performance less predictable. `ContiguousArray` guarantees the layout the code is already assuming.

## Bad

```swift
final class Handler {
    func handle() {}
}

func run(_ handlers: [Handler]) {
    for handler in handlers {
        handler.handle()
    }
}
```

## Good

```swift
final class Handler {
    func handle() {}
}

func run(_ handlers: ContiguousArray<Handler>) {
    for handler in handlers {
        handler.handle()
    }
}
```

## See Also

- [swift-mem-reserve-known](mem-reserve-known.md) - sizing the storage once the type is chosen
- [swift-mem-slice-storage](mem-slice-storage.md) - keeping views from outliving the storage they borrow
