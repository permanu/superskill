---
id: swift-lint-analyze
lang: swift
prefix: lint
title: Run analyzer rules with swiftlint analyze
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, analyze, analyzer rules]
  files: ["**/*.swift"]
related: [swift-lint-swiftlint-adopt, swift-lint-nested-config]
sources:
  - title: SwiftLint - README
    url: https://github.com/realm/SwiftLint
---
> Run `swiftlint analyze` so analyzer rules execute in CI.

## Why

The SwiftLint README states that analyzer rules form an entirely separate list that is only run by the `analyze` command, and that `swiftlint analyze` lints using the full type-checked AST when given a compiler log path with a clean `swiftc` build invocation. A CI step that runs only `swiftlint` silently skips every analyzer rule, including the type-aware checks that motivated enabling them. Analyze runs are documented as considerably slower, which is why they belong in CI rather than in every edit.

## Bad

```swift
// CI runs:
//   swiftlint
//
// The analyzer_rules set never executes: analyzer rules only run under
// `swiftlint analyze` with a compiler log.
```

## Good

```swift
// CI runs:
//   xcodebuild -workspace App.xcworkspace -scheme App > xcodebuild.log
//   swiftlint analyze --compiler-log-path xcodebuild.log
//
// The type-checked AST enables the analyzer_rules set.
```

## See Also

- [swift-lint-swiftlint-adopt](lint-swiftlint-adopt.md) - where analyzer_rules is declared
- [swift-lint-nested-config](lint-nested-config.md) - scoping rule sets per directory
