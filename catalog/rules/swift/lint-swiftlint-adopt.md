---
id: swift-lint-swiftlint-adopt
lang: swift
prefix: lint
title: Adopt SwiftLint with a committed configuration
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, lint, configuration]
  files: ["**/*.swift"]
related: [swift-lint-swiftlint-strict, swift-lint-swift-format-adopt]
sources:
  - title: SwiftLint - README
    url: https://github.com/realm/SwiftLint
---
> Adopt SwiftLint with a configuration file committed to the repository.

## Why

The SwiftLint README describes the tool as enforcing the style rules generally accepted by the Swift community, configured by a `.swiftlint.yml` file in the directory it runs from, with `disabled_rules`, `opt_in_rules`, and per-rule severity settings. A run with no committed configuration applies whatever defaults the installed version ships, so two machines can disagree about the same file. The committed file makes the rule set reviewable and reproducible.

## Bad

```swift
// CI runs:
//   swiftlint
//
// No .swiftlint.yml is committed, so every machine lints with the
// defaults of whichever SwiftLint release is installed.
```

## Good

```swift
// Repository root:
//   .swiftlint.yml
//
// CI runs:
//   swiftlint --config .swiftlint.yml
//
// The rule set is reviewed and versioned with the code.
```

## See Also

- [swift-lint-swiftlint-strict](lint-swiftlint-strict.md) - making warnings fail the build
- [swift-lint-swift-format-adopt](lint-swift-format-adopt.md) - the formatter that handles whitespace
