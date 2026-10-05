---
id: swift-perf-string-index
lang: swift
prefix: perf
title: Iterate a string instead of reaching characters through integer offsets
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string, index, performance]
  files: ["**/*.swift"]
related: [swift-style-string-interpolation, swift-mem-substring-storage]
sources:
  - title: The Swift Programming Language - Strings and Characters
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/
---
> Iterate a string instead of reaching characters through integer offsets.

## Why

The Strings and Characters chapter explains that different characters can require different amounts of memory, so determining which `Character` is at a particular position requires iterating over each Unicode scalar from the start or the end of the string, and that Swift strings cannot be indexed by integer values. Converting an integer offset into an index with `index(_:offsetBy:)` on every iteration walks from the start each time, which makes the loop quadratic; iterating visits each character once.

## Bad

```swift
let text = "Swift"
for offset in 0..<text.count {
    let index = text.index(text.startIndex, offsetBy: offset)
    print(text[index])
}
```

## Good

```swift
let text = "Swift"
for character in text {
    print(character)
}
```

## See Also

- [swift-style-string-interpolation](style-string-interpolation.md) - building strings from values
- [swift-mem-substring-storage](mem-substring-storage.md) - converting substrings for long-term storage
