---
id: swift-mem-pointer-pairing
lang: swift
prefix: mem
title: Pair pointer allocation with initialization, deinitialization, and deallocation
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unsafe pointer, allocate, deallocate, initialize]
  files: ["**/*.swift"]
  symbols: [allocate, deinitialize, deallocate]
related: [swift-mem-pointer-scope, swift-mem-managed-buffer]
sources:
  - title: UnsafeMutablePointer
    url: https://developer.apple.com/documentation/swift/unsafemutablepointer
---
> Initialize allocated memory before reading it and deinitialize it before deallocating.

## Why

The UnsafeMutablePointer documentation describes the memory states a pointer can reference: uninitialized memory must be initialized before it can be read, and deallocating initialized memory without deinitializing it leaks whatever the elements own. It also states that you are responsible for handling the life cycle of any memory you work with to avoid leaks or undefined behavior. Registering deinitialization and deallocation with `defer` at the point of allocation keeps the states in order on every exit path.

## Bad

```swift
func makeBuffer(count: Int) -> UnsafeMutablePointer<Int> {
    UnsafeMutablePointer<Int>.allocate(capacity: count)
}
```

## Good

```swift
func makeBuffer(count: Int) -> [Int] {
    let pointer = UnsafeMutablePointer<Int>.allocate(capacity: count)
    defer { pointer.deallocate() }
    pointer.initialize(repeating: 0, count: count)
    defer { pointer.deinitialize(count: count) }
    return Array(UnsafeBufferPointer(start: pointer, count: count))
}
```

## See Also

- [swift-mem-pointer-scope](mem-pointer-scope.md) - when the storage is borrowed instead of allocated
- [swift-mem-managed-buffer](mem-managed-buffer.md) - the managed container that owns element storage
