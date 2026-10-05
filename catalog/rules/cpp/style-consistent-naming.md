---
id: cpp-style-consistent-naming
lang: cpp
prefix: style
title: Use one naming convention consistently
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, conventions, identifiers]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-style-name-length, cpp-style-no-type-in-name]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Identifiers
    url: https://en.cppreference.com/w/cpp/language/identifiers
---
> One convention lets the spelling of a name be read without guessing.

## Why

NL.8 asks to use a consistent naming style. The identifiers reference supplies the mechanical reason: identifiers are case-sensitive, every character is significant, and unqualified lookup associates a name with its declaration — so `failedCount` and `failed_count` are unrelated entities, and a codebase that mixes conventions turns every mention into a memory test. A single convention, written down and checked in review, makes the shape of a name part of its meaning.

## Bad

```cpp
int process_count = 0; // snake_case
int failedCount = 0;   // camelCase in the same file

int main() {
    return process_count + failedCount == 0 ? 0 : 1;
}
```

## Good

```cpp
int process_count = 0;
int failed_count = 0; // the same style throughout

int main() {
    return process_count + failed_count == 0 ? 0 : 1;
}
```

## See Also

- [cpp-style-name-length](style-name-length.md) - how long a name should be
- [cpp-style-no-type-in-name](style-no-type-in-name.md) - what a name should not carry
