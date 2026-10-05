---
id: swift-style-nil-coalescing
lang: swift
prefix: style
title: Use the nil-coalescing operator for a default value
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nil-coalescing, default value, optionals]
  files: ["**/*.swift"]
related: [swift-style-optional-shorthand, swift-style-optional-chaining]
sources:
  - title: The Swift Programming Language - Basic Operators
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/basicoperators/
---
> Use the nil-coalescing operator for an optional with a default value.

## Why

The Basic Operators chapter defines `a ?? b` as shorthand for `a != nil ? a! : b` and describes it as the more elegant way to encapsulate the check and the unwrap, with short-circuit evaluation that skips the default when the optional holds a value. The explicit ternary repeats the expression and force-unwraps it; the operator states the fallback once.

## Bad

```swift
let userDefinedColorName: String? = nil
let defaultColorName = "red"
let colorName = userDefinedColorName != nil ? userDefinedColorName! : defaultColorName
print(colorName)
```

## Good

```swift
let userDefinedColorName: String? = nil
let defaultColorName = "red"
let colorName = userDefinedColorName ?? defaultColorName
print(colorName)
```

## See Also

- [swift-style-optional-shorthand](style-optional-shorthand.md) - binding an optional without a default
- [swift-style-optional-chaining](style-optional-chaining.md) - reaching through nested optionals
