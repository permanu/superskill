---
id: swift-lint-swift-format-lint-ci
lang: swift
prefix: lint
title: Check formatting in CI instead of rewriting files
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swift-format, lint, ci]
  files: ["**/*.swift"]
related: [swift-lint-swift-format-adopt, swift-lint-swiftlint-strict]
sources:
  - title: swift-format - README
    url: https://github.com/swiftlang/swift-format
---
> Run `swift-format lint --strict` in CI instead of formatting in place.

## Why

The swift-format README documents the `lint` subcommand as checking files and printing diagnostics without rewriting them, and the `-s/--strict` option as making lint warnings exit non-zero. The `format` subcommand's `-i/--in-place` option overwrites the input files with no backup, so running it in CI edits a throwaway workspace and reports success while the committed code stays unformatted. Lint mode makes the failure visible where it can be fixed.

## Bad

```swift
// CI runs:
//   swift-format format --in-place --recursive Sources
//
// The workspace is rewritten and discarded; the step exits successfully
// while the committed files remain unformatted.
```

## Good

```swift
// CI runs:
//   swift-format lint --strict --recursive Sources
//
// Violations are reported against the checked-out revision and fail the
// step; developers run the formatter locally.
```

## See Also

- [swift-lint-swift-format-adopt](lint-swift-format-adopt.md) - the configuration both modes read
- [swift-lint-swiftlint-strict](lint-swiftlint-strict.md) - the same gate for lint rules
