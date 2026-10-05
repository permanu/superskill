---
id: swift-lint-swiftlint-strict
lang: swift
prefix: lint
title: Fail the lint step on warnings
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, strict, ci]
  files: ["**/*.swift"]
related: [swift-lint-swiftlint-adopt, swift-lint-swift-format-lint-ci]
sources:
  - title: SwiftLint - README
    url: https://github.com/realm/SwiftLint
---
> Run SwiftLint in strict mode so warnings fail the build.

## Why

The SwiftLint README documents the `strict` configuration setting as treating all warnings as errors, and its pre-commit example invokes the tool as `swiftlint --fix --strict`. Without strict mode a violation prints as a warning and the step still succeeds, so warnings accumulate and the lint result stops being a gate. Strict mode turns the same findings into a failing exit code.

## Bad

```swift
// CI runs:
//   swiftlint
//
// Violations print as warnings and the step still exits successfully.
```

## Good

```swift
// CI runs:
//   swiftlint --strict
//
// Warnings fail the step; .swiftlint.yml can also set:
//   strict: true
```

## See Also

- [swift-lint-swiftlint-adopt](lint-swiftlint-adopt.md) - the committed configuration this runs against
- [swift-lint-swift-format-lint-ci](lint-swift-format-lint-ci.md) - the same gate for formatting
