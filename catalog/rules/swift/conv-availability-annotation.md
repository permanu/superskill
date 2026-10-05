---
id: swift-conv-availability-annotation
lang: swift
prefix: conv
title: Declare OS version requirements with available
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [available, deployment, version]
  files: ["**/*.swift"]
related: [swift-conv-available-runtime, swift-proj-platform-conditional]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Declare an API's OS version requirement with `@available` instead of an internal check.

## Why

The Attributes chapter documents `@available` as stating a declaration's life cycle relative to platforms and versions, with `introduced` naming the first version that provides it. When a whole function exists only for newer systems, an internal `#available` branch hides that requirement from the signature: callers cannot see that the function needs the newer OS, and the fallback path becomes dead weight. Marking the declaration puts the requirement in the type system, where the compiler enforces it at each call site.

## Bad

```swift
func makeWidget() -> String {
    if #available(iOS 14, *) {
        return "widget"
    }
    return "none"
}
```

## Good

```swift
@available(iOS 14, *)
func makeWidget() -> String {
    "widget"
}
```

## See Also

- [swift-conv-available-runtime](conv-available-runtime.md) - checking availability at runtime when it varies
- [swift-proj-platform-conditional](proj-platform-conditional.md) - branching on the target platform itself
