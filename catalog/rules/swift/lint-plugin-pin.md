---
id: swift-lint-plugin-pin
lang: swift
prefix: lint
title: Pin the lint toolchain version
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftlint, version, plugin]
  files: ["**/*.swift"]
related: [swift-lint-swiftlint-adopt, swift-lint-swiftlint-strict]
sources:
  - title: SwiftLint - README
    url: https://github.com/realm/SwiftLint
---
> Pin the lint toolchain version instead of installing the latest release.

## Why

The SwiftLint README's installation section recommends consuming the SwiftPM plugin with an exact version requirement and notes that installing through CocoaPods enables pinning to a specific version rather than the latest, which is the case with Homebrew. SwiftLint adds rules over time, so an unpinned install turns a tool upgrade into a repository-wide lint failure that no code change caused. A pinned version makes the upgrade an explicit, reviewable change.

## Bad

```swift
// CI installs the latest release:
//   brew install swiftlint
//
// A new SwiftLint release adds rules; previously clean commits start
// failing with no code change.
```

## Good

```swift
// CI resolves a pinned dependency instead:
//   swift package plugin swiftlint
//
// The plugin version is declared with an exact requirement in
// Package.swift, so the toolchain only changes when the pin does.
```

## See Also

- [swift-lint-swiftlint-adopt](lint-swiftlint-adopt.md) - the configuration the pinned version reads
- [swift-lint-swiftlint-strict](lint-swiftlint-strict.md) - turning findings into a gate
