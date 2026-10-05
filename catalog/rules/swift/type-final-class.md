---
id: swift-type-final-class
lang: swift
prefix: type
title: Mark classes final unless subclassing is part of the design
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [final, class, inheritance, override]
  files: ["**/*.swift"]
  symbols: [final, class]
related: [swift-type-access-control, swift-type-struct-default]
sources:
  - title: The Swift Programming Language - Inheritance
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/inheritance/
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Write `final` on a class until a concrete need for subclasses exists.

## Why

The Swift book describes `final` as the modifier that prevents overriding and reports any attempt to subclass a final class as a compile-time error. Leaving every internal class open to inheritance invites overrides that depend on implementation details and makes each method a potential extension point that must be preserved. Marking the class final records that subclassing is not part of the contract; removing it later is additive.

## Bad

```swift
class SessionManager {
    var token: String?

    func refresh() {
        token = "new"
    }
}
```

## Good

```swift
final class SessionManager {
    var token: String?

    func refresh() {
        token = "new"
    }
}
```

## See Also

- [swift-type-access-control](type-access-control.md) - narrowing the other axis of a type's contract
- [swift-type-struct-default](type-struct-default.md) - preferring value types removes the question
