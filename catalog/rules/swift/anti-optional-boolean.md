---
id: swift-anti-optional-boolean
lang: swift
prefix: anti
title: Do not use Optional for a two-state boolean
severity: should
enforce: both
tool: swiftlint:discouraged_optional_boolean
baseline: latest
status: verified
triggers:
  keywords: [optional, boolean, tri-state]
  files: ["**/*.swift"]
related: [swift-type-optional-absence, swift-anti-optional-collection]
sources:
  - title: SwiftLint - discouraged_optional_boolean
    url: https://realm.github.io/SwiftLint/discouraged_optional_boolean.html
---
> Do not use `Optional` for a boolean whose `nil` means the same as `false`.

## Why

SwiftLint's opt-in `discouraged_optional_boolean` rule prefers non-optional booleans over optional booleans. An optional `Bool` whose `nil` is treated like `false` adds a third state that every reader and call site must collapse with `== true` or `?? false`. Keeping the plain boolean removes the collapse; `Optional` stays for cases where absence is genuinely distinct from both values.

## Bad

```swift
struct Settings {
    var notificationsEnabled: Bool?
}

let settings = Settings(notificationsEnabled: nil)
print(settings.notificationsEnabled == true)
```

## Good

```swift
struct Settings {
    var notificationsEnabled = false
}

let settings = Settings()
print(settings.notificationsEnabled)
```

## See Also

- [swift-type-optional-absence](type-optional-absence.md) - when absence is real, use Optional
- [swift-anti-optional-collection](anti-optional-collection.md) - the same decision for collections
