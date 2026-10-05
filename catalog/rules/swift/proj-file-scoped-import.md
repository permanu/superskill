---
id: swift-proj-file-scoped-import
lang: swift
prefix: proj
title: Scope a dependency to the file that uses it with a private import
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import, fileprivate, private, module]
  files: ["**/*.swift"]
  symbols: [import]
related: [swift-proj-import-access, swift-proj-scoped-import]
sources:
  - title: Swift Evolution SE-0409 - Access-level modifiers on import declarations
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md
---
> Use `private import` when only one file in the module needs a dependency.

## Why

SE-0409 defines `fileprivate` and `private` imports as dependencies scoped to the declaring source file, with only file-scoped declarations allowed to reference the imported module. A module-wide import makes the dependency available to every file even when one file uses it, which hides the true dependency graph and invites new references elsewhere. The file-scoped import records the actual usage and lets the compiler enforce it.

## Bad

```swift
import Foundation

func currentTimezone() -> String {
    TimeZone.current.identifier
}
```

## Good

```swift
private import Foundation

private func currentTimezone() -> String {
    TimeZone.current.identifier
}
```

## See Also

- [swift-proj-import-access](proj-import-access.md) - the module-wide variant of the same control
- [swift-proj-scoped-import](proj-scoped-import.md) - narrowing which symbols are visible instead of which file
