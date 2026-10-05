---
id: swift-style-string-interpolation
lang: swift
prefix: style
title: Build strings with interpolation instead of concatenation
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string interpolation, concatenation, strings]
  files: ["**/*.swift"]
sources:
  - title: The Swift Programming Language - Strings and Characters
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/
---
> Build strings with interpolation instead of concatenation.

## Why

The Strings and Characters chapter defines string interpolation as constructing a new string from a mix of constants, variables, literals, and expressions inside a string literal. Concatenation splits one sentence into fragments and requires explicit conversions for non-string values; the interpolated form keeps the sentence readable and converts each value through its string representation.

## Bad

```swift
let name = "Ada"
let count = 3
let message = "Hello, " + name + "! You have " + String(count) + " new messages."
```

## Good

```swift
let name = "Ada"
let count = 3
let message = "Hello, \(name)! You have \(count) new messages."
```

## See Also

- [swift-mem-substring-storage](mem-substring-storage.md) - converting substrings for long-term storage
- [swift-err-localized-user-message](err-localized-user-message.md) - composing the message a user reads
