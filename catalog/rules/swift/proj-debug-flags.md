---
id: swift-proj-debug-flags
lang: swift
prefix: proj
title: Gate debug-only code with a compilation condition, not a runtime constant
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [debug, conditional compilation, build configuration]
  files: ["**/*.swift"]
  symbols: [DEBUG]
related: [swift-proj-platform-conditional, swift-proj-canimport]
sources:
  - title: The Swift Programming Language - Statements
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/statements/
---
> Remove debug-only code from release builds with a compilation condition instead of an `if` over a runtime value.

## Why

The Swift book's conditional compilation block is the mechanism for including code only when a compilation condition holds, and build systems define conditions such as `DEBUG` for development configurations. A runtime `if` keeps the code in every build, costs a branch, and depends on a value that must be kept accurate by hand. The compilation condition is evaluated by the compiler, so the debug branch simply does not exist in release.

## Bad

```swift
func log(_ message: String) {
    if isDebugBuild {
        print(message)
    }
}

let isDebugBuild = true
```

## Good

```swift
func log(_ message: String) {
    #if DEBUG
    print(message)
    #endif
}
```

## See Also

- [swift-proj-platform-conditional](proj-platform-conditional.md) - conditions for the target platform
- [swift-proj-canimport](proj-canimport.md) - conditions for available modules
