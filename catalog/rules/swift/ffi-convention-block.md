---
id: swift-ffi-convention-block
lang: swift
prefix: ffi
title: Declare Objective-C blocks with the block calling convention
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [convention, block, callback]
  files: ["**/*.swift"]
related: [swift-ffi-convention-c, swift-ffi-objc-name]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Declare a function value that an Objective-C API takes as a block with `@convention(block)`.

## Why

The Attributes chapter says the `block` argument indicates an Objective-C compatible block reference: the function value is represented as a reference to the block object, an `id`-compatible Objective-C object that embeds its invocation function, and the invocation function uses the C calling convention. A plain Swift function value is not represented as a block object, so an API that takes a block needs the block calling convention. The chapter also notes that a function with the block calling convention cannot be converted to the C calling convention.

## Bad

```swift
let handler: (Int) -> Void = { value in
    print(value)
}
```

## Good

```swift
let handler: @convention(block) (Int) -> Void = { value in
    print(value)
}
```

## See Also

- [swift-ffi-convention-c](ffi-convention-c.md) - the C function pointer equivalent
- [swift-ffi-objc-name](ffi-objc-name.md) - naming declarations for Objective-C
