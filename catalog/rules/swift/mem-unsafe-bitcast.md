---
id: swift-mem-unsafe-bitcast
lang: swift
prefix: mem
title: Avoid unsafeBitCast for class and pointer conversions
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unsafeBitCast, pointer, reference, type system]
  files: ["**/*.swift"]
  symbols: [unsafeBitCast, Unmanaged]
related: [swift-arc-unmanaged, swift-mem-pointer-scope]
sources:
  - title: unsafeBitCast(_:to:)
    url: https://developer.apple.com/documentation/swift/unsafebitcast(_:to:)
---
> Convert between pointer and reference values with the supported APIs instead of `unsafeBitCast`.

## Why

Apple's documentation warns that `unsafeBitCast` breaks the guarantees of the Swift type system and that casting a pointer or integer to a reference type is undefined behavior that may produce incorrect code in any future compiler release. It lists the conversions the standard library already supports, such as `init(bitPattern:)` for pointer and integer values and `Unmanaged` for reference round-trips. The supported conversions keep the runtime's assumptions intact; the bit cast does not.

## Bad

```swift
final class Box {
    let value = 1
}

func asBox(_ pointer: UnsafeMutableRawPointer) -> Box {
    unsafeBitCast(pointer, to: Box.self)
}
```

## Good

```swift
final class Box {
    let value = 1
}

func asBox(_ pointer: UnsafeMutableRawPointer) -> Box {
    Unmanaged<Box>.fromOpaque(pointer).takeUnretainedValue()
}
```

## See Also

- [swift-arc-unmanaged](arc-unmanaged.md) - balancing the retain counts of the reference that comes back
- [swift-mem-pointer-scope](mem-pointer-scope.md) - the lifetime rules for the pointer being converted
