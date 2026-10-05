---
id: swift-ffi-objc-name
lang: swift
prefix: ffi
title: Prefix the Objective-C name you expose
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [objc, naming, interop]
  files: ["**/*.swift"]
related: [swift-ffi-objc-members, swift-ffi-nonobjc]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Prefix the Objective-C name you expose with three letters.

## Why

The Attributes chapter says the `objc` attribute tells the compiler that a declaration is available to use in Objective-C code, and that it optionally accepts an identifier naming the entity for Objective-C. If you specify the Objective-C name for a class, protocol, or enumeration, include a three-letter prefix on the name, following the platform's naming convention; an unprefixed name risks colliding with another module's symbol in the shared Objective-C namespace.

## Bad

```swift
import Foundation

@objc protocol Tracking {}
```

## Good

```swift
import Foundation

@objc(ACMTracking) protocol Tracking {}
```

## See Also

- [swift-ffi-objc-members](ffi-objc-members.md) - exposing only the members that need it
- [swift-ffi-nonobjc](ffi-nonobjc.md) - suppressing exposure that is not wanted
