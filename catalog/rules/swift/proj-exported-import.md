---
id: swift-proj-exported-import
lang: swift
prefix: proj
title: Do not re-export dependencies with the exported import attribute
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exported import, re-export, dependency creep]
  files: ["**/*.swift"]
  symbols: ["@_exported"]
related: [swift-proj-import-access, swift-proj-file-scoped-import]
sources:
  - title: Swift Evolution SE-0409 - Access-level modifiers on import declarations
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md
---
> Import dependencies normally; do not attach `@_exported` to make clients see them as part of your module.

## Why

SE-0409 describes `@_exported` as a step above a public import, where clients see the imported module's declarations as if they were part of the local module, and states that encouraging re-export goes against the proposal's motivation of hiding implementation details and limiting dependency creep. A re-exported dependency becomes part of the module's own surface: removing or replacing it later breaks clients that never imported it themselves. Normal imports keep the boundary honest.

## Bad

```swift
@_exported import Foundation

public struct Client {}
```

## Good

```swift
import Foundation

public struct Client {}
```

## See Also

- [swift-proj-import-access](proj-import-access.md) - marking a dependency as internal instead
- [swift-proj-file-scoped-import](proj-file-scoped-import.md) - scoping a dependency to one file
