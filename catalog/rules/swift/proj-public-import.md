---
id: swift-proj-public-import
lang: swift
prefix: proj
title: Declare public imports explicitly for dependencies exposed in the API
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [public import, dependency, module, migration]
  files: ["**/*.swift"]
  symbols: [import]
related: [swift-proj-import-access, swift-proj-exported-import]
sources:
  - title: Swift Evolution SE-0409 - Access-level modifiers on import declarations
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md
---
> Write `public import` when a dependency appears in the module's public signatures.

## Why

SE-0409 states that an import without an explicit access level is public in current language modes but becomes internal in a future language mode, with the opt-in `InternalImportsByDefault` feature enabling the new default early. Code that relies on the implicit public default will need a migration script or manual edits when that lands. Writing `public import` where the dependency is genuinely exposed documents the intent now and keeps the module compiling under either default.

## Bad

```swift
import Foundation

public func makeFormatter() -> NumberFormatter {
    NumberFormatter()
}
```

## Good

```swift
public import Foundation

public func makeFormatter() -> NumberFormatter {
    NumberFormatter()
}
```

## See Also

- [swift-proj-import-access](proj-import-access.md) - the internal case for implementation-only dependencies
- [swift-proj-exported-import](proj-exported-import.md) - why public is the ceiling and `@_exported` goes further
