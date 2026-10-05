---
id: swift-macro-declaration-public
lang: swift
prefix: macro
title: Declare macros public
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, public, visibility]
  files: ["**/*.swift"]
related: [swift-macro-naming, swift-macro-names-list]
sources:
  - title: The Swift Programming Language - Macros
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/macros/
---
> Declare every macro `public`.

## Why

The Macros chapter notes that macros are always declared as `public`: because the code that declares a macro is in a different module from the code that uses that macro, there is nowhere a nonpublic macro could be applied. A macro declaration without `public` cannot serve callers outside its own module, and the macro keyword exists to expose compile-time generation to other modules in the first place.

## Bad

```swift
@freestanding(expression)
macro myLine() -> Int = #externalMacro(module: "M", type: "T")
```

## Good

```swift
@freestanding(expression)
public macro myLine() -> Int = #externalMacro(module: "M", type: "T")
```

## See Also

- [swift-macro-naming](macro-naming.md) - the naming conventions for declarations
- [swift-macro-names-list](macro-names-list.md) - declaring what the expansion generates
