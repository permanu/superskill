---
id: swift-const-legacy-constant
lang: swift
prefix: const
title: Reference constants through their type
severity: prefer
enforce: tool
tool: swiftlint:legacy_constant
baseline: latest
status: verified
triggers:
  keywords: [legacy constant, cgpoint, namespace]
  files: ["**/*.swift"]
related: [swift-const-namespace-enum, swift-anti-legacy-constructor]
sources:
  - title: SwiftLint - legacy_constant
    url: https://realm.github.io/SwiftLint/legacy_constant.html
---
> Reference a constant through its type instead of a legacy global name.

## Why

SwiftLint's `legacy_constant` rule states that struct-scoped constants are preferred over legacy global constants, and it is enabled by default with autocorrection. Names such as `CGPointZero` and `CGFloat(M_PI)` predate the imported type members; `CGPoint.zero` and `CGFloat.pi` carry the constant on the type it belongs to, so completion finds them and the reader sees which type the value describes. SwiftLint enables the rule by default and autocorrects to the member form, so the legacy spelling converges on the type-scoped constant.

## Bad

```swift
import CoreGraphics

let origin = CGPointZero
print(origin)
```

## Good

```swift
import CoreGraphics

let origin = CGPoint.zero
print(origin)
```

## See Also

- [swift-const-namespace-enum](const-namespace-enum.md) - scoping your own constants to a type
- [swift-anti-legacy-constructor](anti-legacy-constructor.md) - the same migration for constructors
