---
id: swift-api-deprecation
lang: swift
prefix: api
title: Deprecate replaced declarations with an available attribute and a message
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecated, available, migration, replacement]
  files: ["**/*.swift"]
  symbols: ["@available"]
related: [swift-api-overload-return-type, swift-api-case-conventions]
sources:
  - title: The Swift Programming Language - Attributes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes/
---
> Mark a superseded declaration deprecated and say what to use instead.

## Why

The Swift book documents the `available` attribute as the way to state a declaration's life cycle, with a `deprecated` argument that marks it as deprecated and an optional message that explains the replacement. Deleting the old declaration breaks every caller at once; leaving it unmarked lets new code keep adopting it. A deprecation warning with a message turns the migration into a compile-time instruction at each call site.

## Bad

```swift
func oldLoad() -> String {
    "data"
}
```

## Good

```swift
@available(*, deprecated, message: "Use load() instead.")
func oldLoad() -> String {
    "data"
}
```

## See Also

- [swift-api-overload-return-type](api-overload-return-type.md) - renaming rather than overloading during an evolution
- [swift-api-case-conventions](api-case-conventions.md) - the naming rules a replacement should follow
