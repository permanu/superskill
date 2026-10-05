---
id: swift-type-let-over-var
lang: swift
prefix: type
title: Declare values that never change with let
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [let, var, immutability, constants]
  files: ["**/*.swift"]
  symbols: [let, var]
related: [swift-type-access-control, swift-type-struct-default]
sources:
  - title: The Swift Programming Language - The Basics
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/
---
> Use `let` for every binding that is never reassigned and every property that never changes.

## Why

The Swift book states the rule directly: if a stored value will not change, always declare it as a constant with `let`, and use variables only for values that change. A `var` that is never written promises mutability the code does not need, so readers must search for the writes that do not exist and the compiler cannot enforce the invariant. `let` makes the immutability local and checkable.

## Bad

```swift
struct AppInfo {
    var name = "Sample"
    var build = 1
}

func describe() -> String {
    var info = AppInfo()
    return "\(info.name) build \(info.build)"
}
```

## Good

```swift
struct AppInfo {
    var name = "Sample"
    var build = 1
}

func describe() -> String {
    let info = AppInfo()
    return "\(info.name) build \(info.build)"
}
```

## See Also

- [swift-type-access-control](type-access-control.md) - narrowing what can be written from outside
- [swift-type-struct-default](type-struct-default.md) - value types whose constants stay constant
