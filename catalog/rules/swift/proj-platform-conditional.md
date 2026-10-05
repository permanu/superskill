---
id: swift-proj-platform-conditional
lang: swift
prefix: proj
title: Branch on the target platform with os(), not runtime string checks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [os, conditional compilation, platform, target]
  files: ["**/*.swift"]
  symbols: [os]
related: [swift-proj-canimport, swift-proj-debug-flags]
sources:
  - title: The Swift Programming Language - Statements
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/statements/
---
> Select platform-specific code with the `os()` compilation condition.

## Why

The Swift book's conditional compilation block provides the `os()` condition for testing the target operating system at compile time. A runtime check against a version string or environment variable depends on values that vary with locale, OS release, and sandboxing, and it leaves both branches in the binary. The compilation condition is resolved by the compiler for the actual target and removes the other branch entirely.

## Bad

```swift
import Foundation

func pathSeparator() -> String {
    if ProcessInfo.processInfo.operatingSystemVersionString.contains("macOS") {
        return "/"
    }
    return "\\"
}
```

## Good

```swift
func pathSeparator() -> String {
    #if os(macOS)
    "/"
    #else
    "\\"
    #endif
}
```

## See Also

- [swift-proj-canimport](proj-canimport.md) - testing for a module rather than an operating system
- [swift-proj-debug-flags](proj-debug-flags.md) - testing the build configuration
