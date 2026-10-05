---
id: swift-macro-names-list
lang: swift
prefix: macro
title: Declare the names a macro generates
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro names, expansion, declaration]
  files: ["**/*.swift"]
related: [swift-macro-role-match, swift-macro-extension-conformances]
sources:
  - title: The Swift Programming Language - Macros
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/macros/
---
> List the names a macro generates in its declaration.

## Why

The Macros chapter says a macro's declaration provides information about the names of the symbols that the macro generates, and that when a declaration provides a list of names it is guaranteed to produce only declarations that use those names, which helps you understand and debug the generated code. The chapter's `@OptionSet` declaration lists `named(RawValue)`, `named(rawValue)`, and `named(`init`)`, plus `arbitrary` for the names that are not known until the macro is used.

## Bad

```swift
@attached(member)
@attached(extension, conformances: OptionSet)
public macro MyOptionSet<RawType>() = #externalMacro(module: "MyMacros", type: "MyOptionSetMacro")
```

## Good

```swift
@attached(member, names: named(rawValue), named(`init`), arbitrary)
@attached(extension, conformances: OptionSet)
public macro MyOptionSet<RawType>() = #externalMacro(module: "MyMacros", type: "MyOptionSetMacro")
```

## See Also

- [swift-macro-role-match](macro-role-match.md) - picking the role first
- [swift-macro-extension-conformances](macro-extension-conformances.md) - declaring conformances the same way
