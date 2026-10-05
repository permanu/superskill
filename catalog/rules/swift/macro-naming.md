---
id: swift-macro-naming
lang: swift
prefix: macro
title: Name freestanding macros in lower camel case
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro naming, freestanding, camel case]
  files: ["**/*.swift"]
related: [swift-macro-declaration-public, swift-macro-role-match]
sources:
  - title: The Swift Programming Language - Macros
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/macros/
---
> Name a freestanding macro in lower camel case and an attached macro in upper camel case.

## Why

The Macros chapter states the rule directly: an attached macro's name uses upper camel case, like the names for structures and classes, while freestanding macros have lower camel case names, like the names for variables and functions. The call site reinforces it — a freestanding macro is written with a `#` like a function call, and an attached macro with an `@` like an attribute — so the name shape should match what the call looks like.

## Bad

```swift
@freestanding(expression)
public macro FourCharacterCode(_ string: String) -> UInt32 = #externalMacro(module: "MyMacros", type: "FourCharacterCode")
```

## Good

```swift
@freestanding(expression)
public macro fourCharacterCode(_ string: String) -> UInt32 = #externalMacro(module: "MyMacros", type: "FourCharacterCode")
```

## See Also

- [swift-macro-declaration-public](macro-declaration-public.md) - the visibility every macro declaration shares
- [swift-macro-role-match](macro-role-match.md) - declaring what the macro generates
