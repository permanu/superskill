---
id: swift-lint-superfluous-disable
lang: swift
prefix: lint
title: Remove suppressions that no longer cover a violation
severity: should
enforce: tool
tool: swiftlint:superfluous_disable_command
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, disable, stale]
  files: ["**/*.swift"]
related: [swift-lint-disable-scope, swift-lint-disable-reason]
sources:
  - title: SwiftLint - superfluous_disable_command
    url: https://realm.github.io/SwiftLint/superfluous_disable_command.html
---
> Remove suppressions that no longer cover a violation.

## Why

SwiftLint's `superfluous_disable_command` rule reports a disable command when the disabled rule would not have triggered in the disabled region. A suppression left behind after the code changed keeps a rule switched off around unrelated code, so new violations pass silently. Deleting it restores the check; keeping it requires the exempt code to still exist.

## Bad

```swift
let value: Any = 42
// swiftlint:disable:next force_cast
let count = value as? Int
print(count as Any)
```

## Good

```swift
let value: Any = 42
let count = value as? Int
print(count as Any)
```

## See Also

- [swift-lint-disable-scope](lint-disable-scope.md) - limiting the suppression to the exempt code
- [swift-lint-disable-reason](lint-disable-reason.md) - recording why the exception exists
