---
id: cpp-style-no-confusable-names
lang: cpp
prefix: style
title: Avoid names that are easily misread
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, confusable, readability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-style-name-length, cpp-style-consistent-naming]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Identifiers
    url: https://en.cppreference.com/w/cpp/language/identifiers
---
> l and 1, O and 0: distinct identifiers that look the same.

## Why

NL.19 asks to avoid names that are easily misread. The identifiers reference explains why the trap is real: identifiers may use letters, digits, and underscores, are case-sensitive, and every character is significant — so `l`, `I`, and `1` are three different names, and `O` and `0` are two more. The compiler will keep them apart; the reader will not, and the resulting bug is a wrong-name use that compiles. Spell short names out.

## Bad

```cpp
int main() {
    int l = 1; // l and 1 are hard to tell apart
    int O = 0; // O and 0 as well
    return l + O == 1 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    int one = 1; // spelled out
    int zero = 0;
    return one + zero == 1 ? 0 : 1;
}
```

## See Also

- [cpp-style-name-length](style-name-length.md) - when short names are acceptable
- [cpp-style-consistent-naming](style-consistent-naming.md) - the convention around them
