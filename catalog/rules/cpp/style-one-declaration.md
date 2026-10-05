---
id: cpp-style-one-declaration
lang: cpp
prefix: style
title: Declare one name per declaration
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [declarations, declarators, readability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-style-auto, cpp-style-consistent-naming]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Placeholder type specifiers
    url: https://en.cppreference.com/w/cpp/language/auto
---
> One declarator per line keeps each name, type, and initializer together.

## Why

NL.21 asks to declare one name (only) per declaration. The cppreference declaration page shows a concrete failure of the multi-declarator form: when a declaration declares several entities and uses `auto`, the program is ill-formed if the deduced type is not the same in each deduction — `auto a = 5, b = {1, 2};` is an error, and even `int x = 1, y = 2;` makes the reader run the specifiers across both names. Separate declarations give each name its own line, its own type, and its own initializer.

## Bad

```cpp
int main() {
    int x = 1, y = 2; // two names, one declaration
    return x + y == 3 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    int x = 1; // one name per declaration
    int y = 2;
    return x + y == 3 ? 0 : 1;
}
```

## See Also

- [cpp-style-auto](style-auto.md) - deduction and the multi-declarator trap
- [cpp-style-consistent-naming](style-consistent-naming.md) - the names themselves
