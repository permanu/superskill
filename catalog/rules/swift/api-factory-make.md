---
id: swift-api-factory-make
lang: swift
prefix: api
title: Begin factory method names with make
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [factory, make, naming, construction]
  files: ["**/*.swift"]
  symbols: [make]
related: [swift-api-first-argument-label, swift-api-case-conventions]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Prefix the names of factory methods with `make`.

## Why

The API Design Guidelines state that factory methods begin with `make`, as in `x.makeIterator()`. The prefix separates construction from ordinary computation: a call that returns a freshly created value announces that fact, and the type it produces is discoverable from the return type instead of guessed from a verb. Alternative verbs such as `build` or `create` are not wrong English but break the convention callers and tooling expect.

## Bad

```swift
struct Iterator {
    static func build() -> Iterator {
        Iterator()
    }
}
```

## Good

```swift
struct Iterator {
    static func makeIterator() -> Iterator {
        Iterator()
    }
}
```

## See Also

- [swift-api-first-argument-label](api-first-argument-label.md) - how the first argument of a factory call reads
- [swift-api-case-conventions](api-case-conventions.md) - casing for the rest of the name
