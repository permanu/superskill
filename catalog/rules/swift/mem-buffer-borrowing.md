---
id: swift-mem-buffer-borrowing
lang: swift
prefix: mem
title: Lend collection storage to C with withUnsafeBufferPointer instead of allocating a copy
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [withUnsafeBufferPointer, c interop, allocation, copy]
  files: ["**/*.swift"]
  symbols: [withUnsafeBufferPointer, baseAddress]
related: [swift-mem-pointer-scope, swift-mem-pointer-pairing]
sources:
  - title: ContiguousArray
    url: https://developer.apple.com/documentation/swift/contiguousarray
  - title: UnsafePointer
    url: https://developer.apple.com/documentation/swift/unsafepointer
---
> Pass array storage to a C function through `withUnsafeBufferPointer` instead of copying into a manual allocation.

## Why

Apple documents `withUnsafeBufferPointer` as calling a closure with a pointer to the array's contiguous storage, and the UnsafePointer overview shows implicit bridging of an array to a pointer parameter for the same purpose. A manual allocate-copy-call-deallocate sequence adds a full copy of the data plus allocation and cleanup code that must stay correct on every path. The closure form lends the existing storage for exactly the duration of the call, and the pointer cannot escape it.

## Bad

```swift
func write(_ values: [UInt8]) {
    let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: values.count)
    buffer.initialize(from: values, count: values.count)
    writeBytes(buffer, count: values.count)
    buffer.deallocate()
}

func writeBytes(_ bytes: UnsafeMutablePointer<UInt8>, count: Int) {}
```

## Good

```swift
func write(_ values: [UInt8]) {
    values.withUnsafeBufferPointer { buffer in
        guard let base = buffer.baseAddress else { return }
        writeBytes(base, count: buffer.count)
    }
}

func writeBytes(_ bytes: UnsafePointer<UInt8>, count: Int) {}
```

## See Also

- [swift-mem-pointer-scope](mem-pointer-scope.md) - why the pointer must not escape the closure
- [swift-mem-pointer-pairing](mem-pointer-pairing.md) - the discipline needed when allocation is unavoidable
