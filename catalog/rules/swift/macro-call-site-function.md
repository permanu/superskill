---
id: swift-macro-call-site-function
lang: swift
prefix: macro
title: Report the enclosing function with #function
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [function macro, diagnostics, naming]
  files: ["**/*.swift"]
related: [swift-macro-role-match, swift-macro-naming]
sources:
  - title: The Swift Programming Language - Macros
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/macros/
---
> Report the current function with `#function` instead of a hard-coded name.

## Why

The Macros chapter describes `#function` as a freestanding macro from the Swift standard library: when the code is compiled, Swift calls the macro's implementation, which replaces `#function` with the name of the current function. A hard-coded string cannot track a rename, so the message drifts from the function it claims to describe; the macro reads the name from the declaration itself.

## Bad

```swift
func report() {
    print("report")
}
```

## Good

```swift
func report() {
    print(#function)
}
```

## See Also

- [swift-macro-role-match](macro-role-match.md) - the expression role behind #function
- [swift-macro-naming](macro-naming.md) - naming the macros you declare
