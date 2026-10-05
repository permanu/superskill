---
id: swift-proj-scoped-import
lang: swift
prefix: proj
title: Import only the symbols a file uses from a broad module
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [scoped import, collision, symbol, module]
  files: ["**/*.swift"]
  symbols: [import]
related: [swift-proj-file-scoped-import, swift-proj-import-access]
sources:
  - title: Swift Evolution SE-0409 - Access-level modifiers on import declarations
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md
---
> List the symbols a file needs in the import when the module is broad.

## Why

SE-0409 describes scoped imports as limiting lookup so only the named declaration is visible from that import, and notes they also prioritize resolution of that symbol over same-named declarations from other imports. Importing an entire module drags every top-level name into scope, which invites accidental collisions and hides which parts of the dependency a file actually depends on. The scoped form documents the file's real dependency at its top.

## Bad

```swift
import Foundation

func today() -> Date {
    Date()
}
```

## Good

```swift
import struct Foundation.Date

func today() -> Date {
    Date()
}
```

## See Also

- [swift-proj-file-scoped-import](proj-file-scoped-import.md) - limiting the dependency to one file
- [swift-proj-import-access](proj-import-access.md) - limiting who may reference the dependency
