---
id: swift-mem-pointer-scope
lang: swift
prefix: mem
title: Keep pointers from implicit bridging inside the call that created them
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer, lifetime, unsafe, bridging]
  files: ["**/*.swift"]
  symbols: [UnsafePointer, withUnsafePointer]
related: [swift-mem-pointer-pairing, swift-mem-buffer-borrowing]
sources:
  - title: UnsafePointer
    url: https://developer.apple.com/documentation/swift/unsafepointer
---
> Do not return or store a pointer produced by implicit bridging of a value or array.

## Why

Apple's UnsafePointer documentation states that a pointer created through implicit bridging of an instance or of an array's elements is only valid during the execution of the called function, and that escaping it to use afterward is undefined behavior; it calls out using implicit bridging when calling an `UnsafePointer` initializer as a specific mistake. The pointer borrows storage whose lifetime the compiler controls. A closure form such as `withUnsafePointer` states that lifetime explicitly, so the pointer cannot outlive its storage.

## Bad

```swift
func pointer(to value: inout Int) -> UnsafePointer<Int> {
    UnsafePointer(&value)
}
```

## Good

```swift
func read(_ value: inout Int, _ body: (UnsafePointer<Int>) -> Void) {
    withUnsafePointer(to: &value) { pointer in
        body(pointer)
    }
}
```

## See Also

- [swift-mem-pointer-pairing](mem-pointer-pairing.md) - owning memory directly when a closure scope is not enough
- [swift-mem-buffer-borrowing](mem-buffer-borrowing.md) - lending array storage without allocating
