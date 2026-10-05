---
id: swift-mem-managed-buffer
lang: swift
prefix: mem
title: Destroy live elements in the ManagedBuffer subclass's deinit
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [managedbuffer, deinit, elements, storage]
  files: ["**/*.swift"]
  symbols: [ManagedBuffer, withUnsafeMutablePointerToElements]
related: [swift-mem-pointer-pairing, swift-arc-deinit-release]
sources:
  - title: ManagedBuffer
    url: https://developer.apple.com/documentation/swift/managedbuffer
---
> Deinitialize the element storage in the deinitializer of a `ManagedBuffer` subclass.

## Why

Apple documents `ManagedBuffer`'s element array as suitably aligned raw memory that you are expected to construct and destroy yourself, and states that typical usage destroys any live elements in the deinit of a subclass. Because the buffer is raw memory, ARC never sees the elements: anything they own stays retained after the buffer object dies. Running `deinitialize(count:)` over the live elements in `deinit` releases them with the container.

## Bad

```swift
final class Buffer: ManagedBuffer<Int, UInt8> {
    func first() -> UInt8? {
        withUnsafeMutablePointerToElements { $0.pointee }
    }
}
```

## Good

```swift
final class Buffer: ManagedBuffer<Int, UInt8> {
    deinit {
        withUnsafeMutablePointerToElements { elements in
            elements.deinitialize(count: header)
        }
    }
}
```

## See Also

- [swift-mem-pointer-pairing](mem-pointer-pairing.md) - the same state discipline for raw allocations
- [swift-arc-deinit-release](arc-deinit-release.md) - releasing managed resources at the same point
