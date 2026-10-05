---
id: swift-api-argument-labels
lang: swift
prefix: api
title: Give arguments the label that makes the call read as a grammatical phrase
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [argument label, naming, call site]
  files: ["**/*.swift"]
  symbols: [argument label]
related: [swift-api-first-argument-label, swift-api-omit-needless-words]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Label an argument when its role would otherwise be ambiguous at the call site.

## Why

The API Design Guidelines put clarity at the point of use first: a method is declared once but used repeatedly, and a call like `list.remove(3)` does not say whether 3 is a position or a value. The guidelines use `remove(at:)` as the example where the label is what makes the call unambiguous. Labels are the call-site documentation that survives refactoring, because they are enforced by the compiler.

## Bad

```swift
struct List {
    private var elements: [Int] = []

    mutating func remove(_ position: Int) -> Int {
        elements.remove(at: position)
    }
}
```

## Good

```swift
struct List {
    private var elements: [Int] = []

    mutating func remove(at position: Int) -> Int {
        elements.remove(at: position)
    }
}
```

## See Also

- [swift-api-first-argument-label](api-first-argument-label.md) - labels for initializer conversions
- [swift-api-omit-needless-words](api-omit-needless-words.md) - labels that repeat type information
