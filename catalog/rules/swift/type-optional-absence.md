---
id: swift-type-optional-absence
lang: swift
prefix: type
title: Represent absence with an Optional, not a sentinel value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, absence, sentinel, nil]
  files: ["**/*.swift"]
  symbols: [Optional, nil]
related: [swift-type-enum-state, swift-err-optional-not-failure]
sources:
  - title: The Swift Programming Language - The Basics
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/
---
> Use an Optional for a value that can be missing instead of an in-band sentinel.

## Why

The Swift book defines optionals as the type for "there is a value" or "there isn't a value at all", and non-optional values are guaranteed never to be missing. Sentinels such as an empty string or a negative count blur a real value with the absence marker, so callers must know the convention and the compiler cannot enforce it. The optional moves that check into the type system.

## Bad

```swift
struct User {
    var middleName = ""

    var displayName: String {
        middleName.isEmpty ? "no middle name" : middleName
    }
}
```

## Good

```swift
struct User {
    var middleName: String?

    var displayName: String {
        middleName ?? "no middle name"
    }
}
```

## See Also

- [swift-type-enum-state](type-enum-state.md) - when absence is one state among several
- [swift-err-optional-not-failure](err-optional-not-failure.md) - when the missing value needs a failure reason
