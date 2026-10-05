---
id: swift-api-prefer-methods
lang: swift
prefix: api
title: Prefer methods and properties to free functions
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [free function, method, receiver, self]
  files: ["**/*.swift"]
  symbols: [func]
related: [swift-api-boolean-assertions, swift-api-case-conventions]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Move behavior onto the type it operates on unless the function has no obvious receiver.

## Why

The API Design Guidelines prefer methods and properties to free functions, reserving free functions for cases with no obvious `self`, unconstrained generics, and established domain notation such as `sin(x)`. A free function whose first parameter is the thing it acts on scatters behavior away from its type and makes discovery harder. The method form groups the operation with the state it uses and reads fluently at the call site.

## Bad

```swift
struct Logger {
    var prefix = "log"
}

func logMessage(_ logger: Logger, _ message: String) {}
```

## Good

```swift
struct Logger {
    var prefix = "log"

    func log(_ message: String) {}
}
```

## See Also

- [swift-api-boolean-assertions](api-boolean-assertions.md) - queries as members of the receiver
- [swift-api-case-conventions](api-case-conventions.md) - naming the members consistently
