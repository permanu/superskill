---
id: swift-macro-extension-conformances
lang: swift
prefix: macro
title: State the conformances an extension macro adds
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro conformances, extension macro]
  files: ["**/*.swift"]
related: [swift-macro-names-list, swift-macro-role-match]
sources:
  - title: The Swift Programming Language - Macros
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/macros/
---
> Name the conformances an `@attached(extension)` macro adds.

## Why

The Macros chapter shows the second role of `@OptionSet` as `@attached(extension, conformances: OptionSet)`, and says that this tells you the macro adds conformance to the `OptionSet` protocol. A bare `@attached(extension)` leaves the declaration silent about what the generated extension carries, so the role no longer tells readers what the expansion does.

## Bad

```swift
@attached(extension)
public macro MyOptionSet<RawType>() = #externalMacro(module: "MyMacros", type: "MyOptionSetMacro")
```

## Good

```swift
@attached(extension, conformances: OptionSet)
public macro MyOptionSet<RawType>() = #externalMacro(module: "MyMacros", type: "MyOptionSetMacro")
```

## See Also

- [swift-macro-names-list](macro-names-list.md) - declaring generated names the same way
- [swift-macro-role-match](macro-role-match.md) - picking the role that fits
