---
id: swift-ffi-nssecurecoding
lang: swift
prefix: ffi
title: Adopt NSSecureCoding for archives
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nssecurecoding, nscoding, archive]
  files: ["**/*.swift"]
related: [swift-ffi-objc-members, swift-ffi-objc-name]
sources:
  - title: NSSecureCoding
    url: https://developer.apple.com/documentation/foundation/nssecurecoding
---
> Adopt `NSSecureCoding` instead of `NSCoding` for objects that cross a trust boundary.

## Why

The `NSSecureCoding` documentation describes the protocol as enabling encoding and decoding in a manner that is robust against object substitution attacks. It notes that decoding with `decodeObject(forKey:)` and verifying the class afterwards is unsafe, because by the time the type can be checked the object has already been constructed and may already be part of an object graph. A conforming class returns `true` from `supportsSecureCoding` and decodes with the class-checking API, so substitution is rejected during decoding.

## Bad

```swift
import Foundation

final class Profile: NSObject, NSCoding {
    let name: String

    init(name: String) {
        self.name = name
    }

    func encode(with coder: NSCoder) {
        coder.encode(name, forKey: "name")
    }

    init?(coder: NSCoder) {
        guard let name = coder.decodeObject(forKey: "name") as? String else {
            return nil
        }
        self.name = name
    }
}
```

## Good

```swift
import Foundation

final class Profile: NSObject, NSSecureCoding {
    static var supportsSecureCoding: Bool { true }

    let name: String

    init(name: String) {
        self.name = name
    }

    func encode(with coder: NSCoder) {
        coder.encode(name, forKey: "name")
    }

    init?(coder: NSCoder) {
        guard let name = coder.decodeObject(of: NSString.self, forKey: "name") as? String else {
            return nil
        }
        self.name = name
    }
}
```

## See Also

- [swift-ffi-objc-members](ffi-objc-members.md) - controlling the Objective-C surface
- [swift-ffi-objc-name](ffi-objc-name.md) - naming what crosses the boundary
