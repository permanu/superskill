---
id: swift-lint-disable-scope
lang: swift
prefix: lint
title: Scope a rule suppression to the line or region it covers
severity: should
enforce: tool
tool: swiftlint:blanket_disable_command
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, disable, suppression]
  files: ["**/*.swift"]
related: [swift-lint-disable-reason, swift-lint-superfluous-disable]
sources:
  - title: SwiftLint - blanket_disable_command
    url: https://realm.github.io/SwiftLint/blanket_disable_command.html
---
> Scope a rule suppression to the line or region it covers.

## Why

SwiftLint's `blanket_disable_command` rule states that `swiftlint:disable` commands should use `next`, `this`, or `previous` to disable a rule for a single line, or pair the command with `swiftlint:enable` to re-enable it after the exempt code, instead of disabling the rule for the rest of the file. A file-wide suppression hides every later violation of the same rule, including ones introduced after the exception was added.

## Bad

```swift
let value: Any = 42
// swiftlint:disable force_cast
let count = value as! Int
print(count)
```

## Good

```swift
let value: Any = 42
// swiftlint:disable:next force_cast
let count = value as! Int
print(count)
```

## See Also

- [swift-lint-disable-reason](lint-disable-reason.md) - recording why the exception exists
- [swift-lint-superfluous-disable](lint-superfluous-disable.md) - removing suppressions that cover nothing
