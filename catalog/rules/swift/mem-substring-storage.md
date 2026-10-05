---
id: swift-mem-substring-storage
lang: swift
prefix: mem
title: Convert a Substring to String before storing it long-term
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [substring, string, storage, lifetime]
  files: ["**/*.swift"]
  symbols: [Substring, String]
related: [swift-mem-slice-storage, swift-type-value-copy]
sources:
  - title: The Swift Programming Language - Strings and Characters
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/
---
> Return or store a `String` copy when a substring must outlive its parent.

## Why

The Swift book's substring section explains that a substring reuses the memory of the string it came from, and that substrings are not suitable for long-term storage because the parent string's storage stays alive as long as any substring is in use. Keeping a small substring can therefore pin a large document in memory, which looks like a leak. Converting with the `String` initializer copies just the characters and releases the parent.

## Bad

```swift
func firstWord(of text: String) -> Substring {
    text.prefix { !$0.isWhitespace }
}
```

## Good

```swift
func firstWord(of text: String) -> String {
    String(text.prefix { !$0.isWhitespace })
}
```

## See Also

- [swift-mem-slice-storage](mem-slice-storage.md) - the same lifetime problem for array slices
- [swift-type-value-copy](type-value-copy.md) - why the copy is the safe direction here
