---
id: swift-arc-unmanaged
lang: swift
prefix: arc
title: Balance Unmanaged references with takeUnretainedValue against passUnretained
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unmanaged, pointer, retain, bridging]
  files: ["**/*.swift"]
  symbols: [Unmanaged, takeRetainedValue, takeUnretainedValue]
related: [swift-arc-weak-cycle, swift-arc-consume-operator]
sources:
  - title: Unmanaged
    url: https://developer.apple.com/documentation/swift/unmanaged
---
> Match an unretained hand-off with `takeUnretainedValue` and a retained one with `takeRetainedValue`.

## Why

Apple's documentation states that using `Unmanaged` makes you partially responsible for keeping the object alive, and that `takeRetainedValue` consumes an unbalanced retain while `takeUnretainedValue` does not. Pairing `passUnretained` with `takeRetainedValue` consumes a retain that was never added, so the object is over-released. The correct pairing keeps the retain count balanced at the boundary.

## Bad

```swift
final class Box {
    let value = 1
}

func pointer(to box: Box) -> UnsafeMutableRawPointer {
    Unmanaged.passUnretained(box).toOpaque()
}

func box(from pointer: UnsafeMutableRawPointer) -> Box {
    Unmanaged<Box>.fromOpaque(pointer).takeRetainedValue()
}
```

## Good

```swift
final class Box {
    let value = 1
}

func pointer(to box: Box) -> UnsafeMutableRawPointer {
    Unmanaged.passUnretained(box).toOpaque()
}

func box(from pointer: UnsafeMutableRawPointer) -> Box {
    Unmanaged<Box>.fromOpaque(pointer).takeUnretainedValue()
}
```

## See Also

- [swift-arc-weak-cycle](arc-weak-cycle.md) - managed alternatives to manual reference handling
- [swift-arc-consume-operator](arc-consume-operator.md) - explicit ownership transfer inside Swift
