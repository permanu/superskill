---
id: swift-ffi-convention-c
lang: swift
prefix: ffi
title: Declare C callbacks with the C calling convention
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [convention, c function pointer, callback]
  files: ["**/*.swift"]
related: [swift-ffi-convention-block, swift-ffi-objc-name]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Declare a function value that a C API will call with `@convention(c)`.

## Why

The Attributes chapter says the `convention` attribute indicates a function type's calling conventions, and the `c` argument indicates a C function reference: the function value carries no context and uses the C calling convention. A nongeneric global function, a local function that does not capture, or a closure that does not capture any local variables can be converted to the C calling convention, while other Swift functions cannot. A plain Swift function value carries context and uses the Swift convention, so it cannot be handed to a C API that expects a function pointer.

## Bad

```swift
let comparator: (Int, Int) -> Int = { a, b in
    a < b ? -1 : (a > b ? 1 : 0)
}
```

## Good

```swift
let comparator: @convention(c) (Int, Int) -> Int = { a, b in
    a < b ? -1 : (a > b ? 1 : 0)
}
```

## See Also

- [swift-ffi-convention-block](ffi-convention-block.md) - the Objective-C block equivalent
- [swift-ffi-objc-name](ffi-objc-name.md) - naming declarations for Objective-C
