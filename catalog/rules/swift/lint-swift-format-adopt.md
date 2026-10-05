---
id: swift-lint-swift-format-adopt
lang: swift
prefix: lint
title: Format with swift-format and a committed configuration
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swift-format, formatting, configuration]
  files: ["**/*.swift"]
related: [swift-lint-swift-format-lint-ci, swift-lint-swiftlint-adopt]
sources:
  - title: swift-format - README
    url: https://github.com/swiftlang/swift-format
---
> Format with swift-format and commit the `.swift-format` configuration.

## Why

The swift-format README describes the tool as the formatting technology behind SourceKit-LSP, and documents that it looks for a JSON-formatted `.swift-format` file in the file's directory, then each parent directory, before falling back to its defaults. Committing that file fixes the settings for the repository, so local runs, editor integration, and CI all produce the same layout instead of each tool applying its own idea of style.

## Bad

```swift
// The team formats by hand; review diffs mix spacing and indentation
// changes with behavior changes, and editors disagree about style.
```

## Good

```swift
// Repository root:
//   .swift-format
//
// Format locally:
//   swift format --in-place --recursive Sources
```

## See Also

- [swift-lint-swift-format-lint-ci](lint-swift-format-lint-ci.md) - checking formatting without rewriting files
- [swift-lint-swiftlint-adopt](lint-swiftlint-adopt.md) - the linter that covers rules beyond layout
