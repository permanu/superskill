---
id: cpp-style-readable-literals
lang: cpp
prefix: style
title: Write long literals with digit separators
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [literals, digit-separators, readability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-anti-magic-constants, cpp-style-auto]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Integer literal
    url: https://en.cppreference.com/w/cpp/language/integer_literal
---
> Digit separators group the digits without changing the value.

## Why

NL.11 asks to make literals readable. The integer-literal reference records the tool: optional single quotes may be inserted between the digits as a separator, and they are ignored when determining the value of the literal — so `1'000'000` and `1000000` are the same number, with the groups visible. Long digit runs are where miscounts live: a missing zero in a buffer size or a mask is a defect the reader cannot see, and the separator makes the groups checkable at a glance.

## Bad

```cpp
int main() {
    const int million = 1000000; // how many zeros?
    const int mask = 0b101010101010; // which bits?
    return million == 1000000 && mask == 2730 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    const int million = 1'000'000; // digit separators
    const int mask = 0b1010'1010'1010;
    return million == 1000000 && mask == 2730 ? 0 : 1;
}
```

## See Also

- [cpp-anti-magic-constants](anti-magic-constants.md) - replacing literals with names
- [cpp-style-auto](style-auto.md) - reading values without repeating their types
