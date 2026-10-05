---
id: swift-proj-canimport
lang: swift
prefix: proj
title: Guard platform-specific modules with canImport
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [canImport, conditional compilation, platform, module]
  files: ["**/*.swift"]
  symbols: [canImport]
related: [swift-proj-platform-conditional, swift-proj-debug-flags]
sources:
  - title: The Swift Programming Language - Statements
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/statements/
---
> Wrap imports and code for a platform-specific module in `#if canImport`.

## Why

The Swift book's conditional compilation block supports the `canImport()` condition, which is true only when the named module can be imported on the target. A top-level import of a module that exists on one platform fails to compile the whole file everywhere else, and the failure is at the module level rather than at the feature level. Guarding the import and the code that uses it with `canImport` lets the same source file build on every target the package supports.

## Bad

```swift
import Darwin

func isRoot() -> Bool {
    getuid() == 0
}
```

## Good

```swift
#if canImport(Darwin)
import Darwin

func isRoot() -> Bool {
    getuid() == 0
}
#endif
```

## See Also

- [swift-proj-platform-conditional](proj-platform-conditional.md) - branching on the platform itself
- [swift-proj-debug-flags](proj-debug-flags.md) - the build-configuration form of conditional code
