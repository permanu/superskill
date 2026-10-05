---
id: swift-proj-import-access
lang: swift
prefix: proj
title: Mark implementation-only dependencies with an internal import
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import, dependency, module, access level]
  files: ["**/*.swift"]
  symbols: [import]
related: [swift-proj-file-scoped-import, swift-proj-exported-import]
sources:
  - title: Swift Evolution SE-0409 - Access-level modifiers on import declarations
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md
---
> Write `internal import` for a dependency that is an implementation detail of the module.

## Why

SE-0409 introduces access-level modifiers on imports so a dependency can be declared visible only to the source file, module, package, or all clients, and the compiler then rejects references from more visible declarations. The proposal's motivating example marks a database adapter as `internal` and gets a diagnostic when a public signature uses it. Without the modifier the dependency is public by default in current language modes, so an accidental reference in a public signature silently exposes it to clients.

## Bad

```swift
import Foundation

public func makeFormatter() -> NumberFormatter {
    NumberFormatter()
}
```

## Good

```swift
internal import Foundation

public func makeFormatter() -> String {
    NumberFormatter().string(from: 0) ?? ""
}
```

## See Also

- [swift-proj-file-scoped-import](proj-file-scoped-import.md) - narrowing a dependency further, to one file
- [swift-proj-exported-import](proj-exported-import.md) - the opposite direction, re-exporting to clients
