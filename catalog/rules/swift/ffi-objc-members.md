---
id: swift-ffi-objc-members
lang: swift
prefix: ffi
title: Expose only the members Objective-C needs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [objcmembers, objc, interop]
  files: ["**/*.swift"]
related: [swift-ffi-nonobjc, swift-ffi-objc-name]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Apply `objc` per member instead of `objcMembers` to the whole class.

## Why

The Attributes chapter says `objcMembers` implicitly applies the `objc` attribute to all Objective-C compatible members of the class, its extensions, its subclasses, and all of the extensions of its subclasses. It states that most code should use the `objc` attribute instead, to expose only the declarations that are needed, and that applying the `objc` attribute when it is not needed can increase binary size and adversely affect performance. The attribute is a convenience for libraries that make heavy use of the Objective-C runtime's introspection facilities, not a default for app code.

## Bad

```swift
import Foundation

@objcMembers
final class Account: NSObject {
    var balance = 0

    func deposit(_ amount: Int) {
        balance += amount
    }
}
```

## Good

```swift
import Foundation

final class Account: NSObject {
    @objc var balance = 0

    @objc func deposit(_ amount: Int) {
        balance += amount
    }
}
```

## See Also

- [swift-ffi-nonobjc](ffi-nonobjc.md) - suppressing the exposure you did not ask for
- [swift-ffi-objc-name](ffi-objc-name.md) - naming what you do expose
