---
id: swift-lint-custom-rules
lang: swift
prefix: lint
title: Encode project conventions as custom rules
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, custom rules, regex]
  files: ["**/*.swift"]
related: [swift-lint-swiftlint-adopt, swift-lint-baseline]
sources:
  - title: SwiftLint - README
    url: https://github.com/realm/SwiftLint
---
> Encode project conventions as custom regex rules.

## Why

The SwiftLint README documents regex-based custom rules declared under `custom_rules` in the configuration, with `included`/`excluded` paths, a `regex`, an optional `message`, and a severity. A convention that exists only in review comments is enforced inconsistently; the same convention written as a custom rule runs on every file and reports the same message at the same severity as the built-in rules.

## Bad

```swift
// Project convention: no direct `UserDefaults.standard` access outside
// the SettingsStore type. Nothing enforces it; reviewers catch it
// sometimes.
```

## Good

```swift
// .swiftlint.yml:
//   custom_rules:
//     no_direct_defaults:
//       name: "Use SettingsStore"
//       regex: "UserDefaults\\.standard"
//       message: "Access defaults through SettingsStore."
//       severity: warning
```

## See Also

- [swift-lint-swiftlint-adopt](lint-swiftlint-adopt.md) - the configuration file custom rules live in
- [swift-lint-baseline](lint-baseline.md) - adopting new rules against existing code
