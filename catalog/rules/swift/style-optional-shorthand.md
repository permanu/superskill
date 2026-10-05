---
id: swift-style-optional-shorthand
lang: swift
prefix: style
title: Use the if let shorthand when shadowing the same optional
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [if let, optional binding, shorthand]
  files: ["**/*.swift"]
related: [swift-style-nil-coalescing, swift-style-optional-chaining]
sources:
  - title: Swift Evolution SE-0345 - if let shorthand
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0345-if-let-shorthand.md
---
> Use the `if let` shorthand when the bound name shadows the same optional.

## Why

SE-0345 introduced the shorthand form for optional binding when the unwrapped variable shadows an existing optional of the same name, replacing `if let foo = foo` with `if let foo`. The proposal notes the repeated identifier makes bindings verbose and pushes authors toward short, less descriptive names; the shorthand keeps descriptive names while stating the unwrap once.

## Bad

```swift
func greeting(for name: String?) -> String {
    if let name = name {
        return "Hello, \(name)!"
    }
    return "Hello!"
}
```

## Good

```swift
func greeting(for name: String?) -> String {
    if let name {
        return "Hello, \(name)!"
    }
    return "Hello!"
}
```

## See Also

- [swift-style-nil-coalescing](style-nil-coalescing.md) - defaulting instead of branching on the optional
- [swift-style-optional-chaining](style-optional-chaining.md) - reaching through nested optionals
