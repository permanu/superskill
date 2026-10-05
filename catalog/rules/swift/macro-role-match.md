---
id: swift-macro-role-match
lang: swift
prefix: macro
title: Match the macro role to the code it generates
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro role, freestanding, declaration]
  files: ["**/*.swift"]
related: [swift-macro-names-list, swift-macro-extension-conformances]
sources:
  - title: The Swift Programming Language - Macros
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/macros/
---
> Declare the role that matches what the macro generates.

## Why

The Macros chapter says a macro declaration defines the macro's roles — the places in source code where the macro can be called, and the kinds of code the macro can generate — and that a freestanding macro writes the `@freestanding` attribute to specify its role. An expression macro produces a value, while a declaration macro generates new declarations. Declaring `expression` for a macro whose job is to generate declarations describes the wrong call sites and the wrong output.

## Bad

```swift
@freestanding(expression)
public macro defineSharedValue() -> Int = #externalMacro(module: "MyMacros", type: "DefineSharedValueMacro")
```

## Good

```swift
@freestanding(declaration)
public macro defineSharedValue() = #externalMacro(module: "MyMacros", type: "DefineSharedValueMacro")
```

## See Also

- [swift-macro-names-list](macro-names-list.md) - declaring the names the expansion produces
- [swift-macro-extension-conformances](macro-extension-conformances.md) - declaring the conformances it adds
