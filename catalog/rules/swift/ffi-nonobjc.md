---
id: swift-ffi-nonobjc
lang: swift
prefix: ffi
title: Suppress Objective-C exposure that is not wanted
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nonobjc, objc, interop]
  files: ["**/*.swift"]
related: [swift-ffi-objc-members, swift-ffi-objc-name]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Mark Swift-only members `@nonobjc` where Objective-C exposure is not wanted.

## Why

The Attributes chapter says `nonobjc` tells the compiler to make a declaration unavailable in Objective-C code, even though it is possible to represent it there, and that applying it to an extension has the same effect as applying it to every member that is not explicitly marked `objc`. It is the tool for resolving circularity in bridging methods and for allowing overloading of methods and initializers in a class marked with the `objc` attribute. In a class that applies `objc` broadly, the Swift-only member needs the suppression to stay out of the Objective-C surface.

## Bad

```swift
import Foundation

@objcMembers
final class Account: NSObject {
    var balance = 0

    func update(balance: Int) {
        self.balance = balance
    }
}
```

## Good

```swift
import Foundation

@objcMembers
final class Account: NSObject {
    var balance = 0

    @nonobjc func update(balance: Int) {
        self.balance = balance
    }
}
```

## See Also

- [swift-ffi-objc-members](ffi-objc-members.md) - avoiding the broad exposure in the first place
- [swift-ffi-objc-name](ffi-objc-name.md) - naming what you do expose
