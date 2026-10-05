---
id: swift-api-overload-return-type
lang: swift
prefix: api
title: Do not overload a method only by return type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overload, return type, ambiguity, inference]
  files: ["**/*.swift"]
  symbols: [overload]
related: [swift-api-default-parameters, swift-type-any-existential]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Give overloads distinct names instead of relying on the expected return type to pick one.

## Why

The API Design Guidelines state that overloading on return type causes ambiguities in the presence of type inference. A call like `box.value()` has no information in it that says which of the same-named methods is meant, so it fails to compile or resolves by accident. Distinct names such as `intValue()` and `stringValue()` make each call unambiguous without relying on surrounding context.

## Bad

```swift
struct Box {
    func value() -> Int? { 1 }
    func value() -> String? { "one" }
}
```

## Good

```swift
struct Box {
    func intValue() -> Int? { 1 }
    func stringValue() -> String? { "one" }
}
```

## See Also

- [swift-api-default-parameters](api-default-parameters.md) - collapsing overloads with defaults instead
- [swift-type-any-existential](type-any-existential.md) - when the return type is erased on purpose
