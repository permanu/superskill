---
id: swift-ffi-cstring
lang: swift
prefix: ffi
title: Decode C strings with String(cString:)
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cstring, c interop, string]
  files: ["**/*.swift"]
related: [swift-ffi-opaque-pointer, swift-ffi-convention-c]
sources:
  - title: String.init(cString:) - UnsafePointer<CChar>
    url: https://developer.apple.com/documentation/swift/string/init(cstring:)-2p84k
  - title: String.init(cString:) - UnsafePointer<UInt8>
    url: https://developer.apple.com/documentation/swift/string/init(cstring:)-6kr8s
---
> Decode a null-terminated C string with `String(cString:)`.

## Why

The `String` documentation describes `init(cString:)` as creating a new string by copying the null-terminated UTF-8 data referenced by the given pointer, and the `UnsafePointer<UInt8>` overload as identical to the `CChar` one but operating on an unsigned sequence of bytes. The initializer owns the termination rule and the UTF-8 decoding, so a caller that walks bytes by hand re-implements both and drifts from the initializer's behavior as edge cases appear.

## Bad

```swift
func decode(_ pointer: UnsafePointer<CChar>) -> String {
    var text = ""
    var index = 0
    while pointer[index] != 0 {
        text.append(Character(UnicodeScalar(UInt8(bitPattern: pointer[index]))))
        index += 1
    }
    return text
}
```

## Good

```swift
func decode(_ pointer: UnsafePointer<CChar>) -> String {
    String(cString: pointer)
}
```

## See Also

- [swift-ffi-opaque-pointer](ffi-opaque-pointer.md) - keeping opaque C handles typed
- [swift-ffi-convention-c](ffi-convention-c.md) - declaring C callbacks
