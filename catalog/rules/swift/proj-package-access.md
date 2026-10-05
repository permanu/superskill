---
id: swift-proj-package-access
lang: swift
prefix: proj
title: Use package access for APIs shared across a package's modules
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [package access, module, internal, api surface]
  files: ["**/*.swift"]
  symbols: [package]
related: [swift-type-access-control, swift-proj-import-access]
sources:
  - title: The Swift Programming Language - Access Control
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/
---
> Mark cross-module APIs inside one package `package` instead of `public`.

## Why

The Swift book defines package access as enabling entities to be used within any source files from their defining package but not outside it, and says it is typically used within an app or framework structured into multiple modules. A multi-module package that widens internal seams to `public` so sibling modules can call them also exposes those symbols to every client. Package access gives sibling modules the visibility they need while keeping the symbol out of the published interface.

## Bad

```swift
public struct Engine {
    public init() {}
    public func start() {}
}
```

## Good

```swift
package struct Engine {
    package init() {}
    package func start() {}
}
```

## See Also

- [swift-type-access-control](type-access-control.md) - the general narrowest-surface rule
- [swift-proj-import-access](proj-import-access.md) - scoping the dependencies those modules import
