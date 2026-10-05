---
id: swift-anti-legacy-constructor
lang: swift
prefix: anti
title: Use Swift initializers instead of legacy convenience functions
severity: prefer
enforce: tool
tool: swiftlint:legacy_constructor
baseline: latest
status: verified
triggers:
  keywords: [cgpointmake, legacy, initializer]
  files: ["**/*.swift"]
related: [swift-anti-force-cast, swift-api-conversion-init-labels]
sources:
  - title: SwiftLint - legacy_constructor
    url: https://realm.github.io/SwiftLint/legacy_constructor.html
---
> Use Swift initializers instead of legacy `Make` convenience functions.

## Why

SwiftLint's `legacy_constructor` rule states that Swift constructors are preferred over legacy convenience functions, and it is enabled by default with autocorrection. The C-style helpers such as `CGPointMake` predate Swift's imported initializers and carry no argument labels; the imported `CGPoint(x:y:)` initializer names each argument, so a call site reads unambiguously and the compiler checks the argument order.

## Bad

```swift
import CoreGraphics

let point = CGPointMake(10, 20)
print(point)
```

## Good

```swift
import CoreGraphics

let point = CGPoint(x: 10, y: 20)
print(point)
```

## See Also

- [swift-anti-force-cast](anti-force-cast.md) - another C-era pattern with a checked Swift form
- [swift-api-conversion-init-labels](api-conversion-init-labels.md) - labeling initializer arguments
