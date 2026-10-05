---
id: cpp-proj-header-class-definition
lang: cpp
prefix: proj
title: Define types used across source files in a header
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [class, headers, definitions, complete-type]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-proj-header-declares, cpp-proj-odr-identical-tokens]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Definitions and ODR
    url: https://en.cppreference.com/w/cpp/language/definition
---
> A class defined only in one .cpp file cannot be used by any other.

## Why

SF.3 asks that header files hold all declarations used in multiple source files. The ODR page adds the type-specific rule: for a class, a definition is required wherever the class is used in a way that requires it to be complete — constructing it, calling members, taking its size. A class defined inside one source file is visible to that file alone; every other translation unit sees only an incomplete type at best. Types that cross source files belong in the header, included by each user.

## Bad

```cpp
// widget.cpp
struct Widget { int id; }; // defined here only: other TUs cannot name it

int main() {
    return Widget{1}.id == 1 ? 0 : 1;
}
```

## Good

```cpp
// widget.hpp
struct Widget { int id; }; // every user includes this

int main() {
    return Widget{1}.id == 1 ? 0 : 1;
}
```

## See Also

- [cpp-proj-header-declares](proj-header-declares.md) - functions, by contrast, can be declared
- [cpp-proj-odr-identical-tokens](proj-odr-identical-tokens.md) - one definition, identical everywhere
