---
id: swift-lint-baseline
lang: swift
prefix: lint
title: Adopt linting incrementally with a baseline
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, baseline, adoption]
  files: ["**/*.swift"]
related: [swift-lint-swiftlint-adopt, swift-lint-custom-rules]
sources:
  - title: SwiftLint - README
    url: https://github.com/realm/SwiftLint
---
> Adopt linting incrementally with a baseline file.

## Why

The SwiftLint README documents the `baseline` setting as the path to a baseline file used to filter out detected violations, and `write_baseline` as the path to record violations as a new baseline. On an existing codebase the first full lint run fails on hundreds of pre-existing violations, and the step gets switched off again. The baseline records those violations once, so only new violations fail the build while the legacy ones are paid down.

## Bad

```swift
// Adopting SwiftLint on a legacy module:
//   swiftlint
//
// Hundreds of pre-existing violations fail the build, so the lint step
// is disabled again and new violations are never caught.
```

## Good

```swift
// .swiftlint.yml during adoption:
//   baseline: Baseline.json
//   write_baseline: Baseline.json
//
// The first run records existing violations; later runs report only
// violations outside the baseline.
```

## See Also

- [swift-lint-swiftlint-adopt](lint-swiftlint-adopt.md) - the configuration the baseline lives beside
- [swift-lint-custom-rules](lint-custom-rules.md) - project-specific checks added to the same run
