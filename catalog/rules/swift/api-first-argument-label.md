---
id: swift-api-first-argument-label
lang: swift
prefix: api
title: Keep the first initializer argument out of the type name's phrase
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [initializer, first argument, label, factory]
  files: ["**/*.swift"]
  symbols: [init]
related: [swift-api-argument-labels, swift-api-factory-make]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Do not let the first argument form a phrase that continues the base name.

## Why

The API Design Guidelines state that the first argument to an initializer or factory call should not form a phrase starting with the base name, and show a color initializer whose first label continues the type name as the anti-pattern against starting with the source value's role. When the first label continues the name, the call reads as one long sentence and every following label has to compensate. Starting the call with the role of the source value keeps the construction readable.

## Bad

```swift
struct RGBColor {
    let red: Int
    let green: Int
    let blue: Int

    init(havingRed red: Int, green: Int, blue: Int) {
        self.red = red
        self.green = green
        self.blue = blue
    }
}
```

## Good

```swift
struct RGBColor {
    let red: Int
    let green: Int
    let blue: Int

    init(red: Int, green: Int, blue: Int) {
        self.red = red
        self.green = green
        self.blue = blue
    }
}
```

## See Also

- [swift-api-argument-labels](api-argument-labels.md) - labels that clarify argument roles
- [swift-api-factory-make](api-factory-make.md) - the factory-method naming rule
