---
id: swift-ffi-opaque-pointer
lang: swift
prefix: ffi
title: Keep opaque C handles as OpaquePointer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [opaquepointer, c interop, handle]
  files: ["**/*.swift"]
related: [swift-ffi-cstring, swift-ffi-convention-c]
sources:
  - title: OpaquePointer
    url: https://developer.apple.com/documentation/swift/opaquepointer
---
> Keep a C handle whose pointee has no Swift type as `OpaquePointer`.

## Why

The `OpaquePointer` documentation describes the type as a wrapper around an opaque C pointer, and says opaque pointers are used to represent C pointers to types that cannot be represented in Swift, such as incomplete struct types. Converting such a handle to `UnsafeMutableRawPointer` discards the only type information the import provided, and suggests to readers that the pointed-to bytes are yours to inspect or manage rather than owned by the C library.

## Bad

```swift
func close(_ handle: UnsafeMutableRawPointer) {}
```

## Good

```swift
func close(_ handle: OpaquePointer) {}
```

## See Also

- [swift-ffi-cstring](ffi-cstring.md) - decoding the strings C APIs return
- [swift-ffi-convention-c](ffi-convention-c.md) - declaring the callbacks they call
