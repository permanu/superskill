---
id: swift-lint-nested-config
lang: swift
prefix: lint
title: Scope rule overrides with nested configurations
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, nested configuration, override]
  files: ["**/*.swift"]
related: [swift-lint-swiftlint-adopt, swift-lint-analyze]
sources:
  - title: SwiftLint - README
    url: https://github.com/realm/SwiftLint
---
> Scope rule overrides with nested configurations instead of widening them.

## Why

The SwiftLint README documents nested configurations: a `.swiftlint.yml` placed in a directory subtree is used as a child config for files in that subtree, while other subtrees keep using the root configuration. When one generated module needs a rule disabled, changing the root configuration disables that rule for the whole repository; the nested file keeps the exception where it belongs. The README notes nested configurations are ignored when a config is passed with `--config`.

## Bad

```swift
// One root .swiftlint.yml with:
//   disabled_rules: [force_cast]
//
// The exception is needed only by the generated client module, so every
// module now lints without the rule.
```

## Good

```swift
// Root .swiftlint.yml keeps the default rule set.
// Sources/Generated/.swiftlint.yml overrides just that subtree:
//   disabled_rules: [force_cast]
//
// SwiftLint walks up from each file and merges the nearest nested config.
```

## See Also

- [swift-lint-swiftlint-adopt](lint-swiftlint-adopt.md) - the root configuration nested files refine
- [swift-lint-analyze](lint-analyze.md) - the CI step that runs the merged rule set
