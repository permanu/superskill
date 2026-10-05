---
id: swift-const-case-iterable
lang: swift
prefix: const
title: Use CaseIterable instead of hand-listing cases
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [caseiterable, allcases, enumeration]
  files: ["**/*.swift"]
related: [swift-const-enum-raw, swift-const-option-set]
sources:
  - title: The Swift Programming Language - Enumerations
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/
---
> Use `CaseIterable` instead of hand-listing an enumeration's cases.

## Why

The Enumerations chapter documents `CaseIterable`: writing it after the enumeration's name provides a collection of all of the enumeration's cases, which the compiler maintains. A hand-written array of cases duplicates the declaration and silently goes stale when a case is added, so the picker or test that reads the list misses the new value. The synthesized `allCases` cannot drift.

## Bad

```swift
enum Theme {
    case light, dark

    static let all: [Theme] = [.light, .dark]
}

print(Theme.all)
```

## Good

```swift
enum Theme: CaseIterable {
    case light, dark
}

print(Theme.allCases)
```

## See Also

- [swift-const-enum-raw](const-enum-raw.md) - naming a fixed set of values
- [swift-const-option-set](const-option-set.md) - sets of combinable flags
