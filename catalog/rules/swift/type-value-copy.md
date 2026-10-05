---
id: swift-type-value-copy
lang: swift
prefix: type
title: Do not rely on a value-type copy to isolate mutable reference state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [value semantics, copy, reference, shared state]
  files: ["**/*.swift"]
  symbols: [struct, class]
related: [swift-type-struct-default, swift-conc-sendable-values]
sources:
  - title: The Swift Programming Language - Structures and Classes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/
---
> Keep value-type storage free of shared mutable references; copying the value does not copy the objects it refers to.

## Why

The Swift book explains that value types are copied when assigned or passed, and that standard-library collections use copy-on-write so the copy behaves as if it were made immediately. A class instance stored inside a struct is copied only by reference: both values point at the same object, so a mutation through one copy appears in the other. Storing value types, or deliberately shared actors and classes, keeps the copy semantics honest.

## Bad

```swift
final class Settings {
    var theme = "light"
}

struct AppState {
    var settings = Settings()
}

var copy = AppState()
let shared = copy
copy.settings.theme = "dark"
print(shared.settings.theme)
```

## Good

```swift
struct Settings {
    var theme = "light"
}

struct AppState {
    var settings = Settings()
}

var copy = AppState()
let shared = copy
copy.settings.theme = "dark"
print(shared.settings.theme)
```

## See Also

- [swift-type-struct-default](type-struct-default.md) - choosing the value type in the first place
- [swift-conc-sendable-values](conc-sendable-values.md) - the concurrency consequence of shared references
