---
id: swift-anti-implicitly-unwrapped
lang: swift
prefix: anti
title: Avoid implicitly unwrapped optionals outside outlets
severity: should
enforce: both
tool: swiftlint:implicitly_unwrapped_optional
baseline: latest
status: verified
triggers:
  keywords: [implicitly unwrapped optional, iuo, optional]
  files: ["**/*.swift"]
related: [swift-anti-force-cast, swift-style-optional-chaining]
sources:
  - title: SwiftLint - implicitly_unwrapped_optional
    url: https://realm.github.io/SwiftLint/implicitly_unwrapped_optional.html
---
> Avoid implicitly unwrapped optionals outside interface builder outlets.

## Why

SwiftLint's opt-in `implicitly_unwrapped_optional` rule states that implicitly unwrapped optionals should be avoided when possible, and its default configuration excludes only interface builder outlets. An implicitly unwrapped optional is a normal optional whose absence traps at the point of use instead of at the point of assignment, so the failure moves away from the code that failed to provide a value. A plain optional keeps the check where the value is read.

## Bad

```swift
final class ProfileView {
    var subtitle: String!
}
```

## Good

```swift
final class ProfileView {
    var subtitle: String?
}
```

## See Also

- [swift-anti-force-cast](anti-force-cast.md) - another trap moved to the point of use
- [swift-style-optional-chaining](style-optional-chaining.md) - reading through optionals without traps
