---
id: swift-conv-available-runtime
lang: swift
prefix: conv
title: Check OS availability with an availability condition
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [available, runtime, version check]
  files: ["**/*.swift"]
related: [swift-conv-availability-annotation, swift-proj-platform-conditional]
sources:
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Check OS availability with an availability condition, not a version number comparison.

## Why

The Control Flow chapter documents the availability condition: an `if` or `guard` condition of the form `#available(platform version, *)` that conditionally executes a block depending on whether the APIs it uses are available at runtime, with the compiler using that information to choose the block. Comparing `ProcessInfo` version numbers reimplements that check in application code, bypasses the compiler's knowledge of which APIs exist on which versions, and breaks when a platform's version scheme is not the one being compared.

## Bad

```swift
import Foundation

let majorVersion = ProcessInfo.processInfo.operatingSystemVersion.majorVersion
if majorVersion >= 14 {
    print("widgets available")
}
```

## Good

```swift
if #available(iOS 14, *) {
    print("widgets available")
}
```

## See Also

- [swift-conv-availability-annotation](conv-availability-annotation.md) - declaring the requirement on the API itself
- [swift-proj-platform-conditional](proj-platform-conditional.md) - branching on the target platform
