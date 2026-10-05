---
id: swift-api-default-parameters
lang: swift
prefix: api
title: Use one method with defaulted parameters instead of a method family
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default arguments, method family, overloads]
  files: ["**/*.swift"]
  symbols: [default parameter]
related: [swift-api-defaults-at-end, swift-type-generic-constraints]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Collapse a family of overloads that differ only by optional configuration into one method with defaults.

## Why

The API Design Guidelines prefer defaulted parameters to method families because every member of a family must be documented and understood separately, and callers have to discover all of them to know which one to use. The guidelines also note that surprising relationships between members, such as `foo(bar: nil)` differing from `foo()`, make the family tedious to use. One signature with defaults hides irrelevant configuration and keeps a single behavior to maintain.

## Bad

```swift
struct Report {
    func render() -> String {
        render(options: [])
    }

    func render(options: [String]) -> String {
        "report"
    }
}
```

## Good

```swift
struct Report {
    func render(options: [String] = []) -> String {
        "report"
    }
}
```

## See Also

- [swift-api-defaults-at-end](api-defaults-at-end.md) - where the defaulted parameters belong
- [swift-type-generic-constraints](type-generic-constraints.md) - another way to collapse duplicate signatures
