---
id: swift-lint-disable-reason
lang: swift
prefix: lint
title: Document a rule suppression with its reason
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, disable, reason]
  files: ["**/*.swift"]
related: [swift-lint-disable-scope, swift-lint-superfluous-disable]
sources:
  - title: SwiftLint - superfluous_disable_command
    url: https://realm.github.io/SwiftLint/superfluous_disable_command.html
---
> Document a rule suppression with its reason after a dash.

## Why

SwiftLint's `superfluous_disable_command` documentation states that a disable command can be documented by appending the reason after a ` - ` separator. A bare suppression records only that someone silenced the rule; the reason after the dash records the condition that makes the exception safe, so the next reader can tell whether the condition still holds before deleting or extending the suppression.

## Bad

```swift
let value: Any = 42
// swiftlint:disable:next force_cast
let count = value as! Int
print(count)
```

## Good

```swift
let value: Any = 42
// swiftlint:disable:next force_cast - the caller guarantees an Int
let count = value as! Int
print(count)
```

## See Also

- [swift-lint-disable-scope](lint-disable-scope.md) - limiting the suppression to the exempt code
- [swift-lint-superfluous-disable](lint-superfluous-disable.md) - removing suppressions that cover nothing
