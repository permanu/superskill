---
id: cpp-proj-odr-identical-tokens
lang: cpp
prefix: proj
title: Every definition of a shared type must be token-identical
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [odr, identical-definitions, headers, types]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-proj-header-class-definition, cpp-proj-header-declares]
sources:
  - title: cppreference - Definitions and ODR
    url: https://en.cppreference.com/w/cpp/language/definition
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Two translation units defining the same class differently is undefined behavior.

## Why

The ODR page lists the conditions for a type to be defined in more than one translation unit: each definition appears in a different translation unit, each consists of the same sequence of tokens, and name lookup finds the same entities — "typically, appears in the same header". Its note makes the failure concrete: if one .cpp file defines `struct S { int x; };` and another defines `struct S { int y; };`, the behavior of the program that links them is undefined, and no diagnostic is required. One header, included everywhere, is what keeps the tokens identical.

## Bad

```cpp
// a.cpp
struct Config { int retries; };

// b.cpp defines its own version:
// struct Config { int timeout; };  // same name, different members: undefined when linked

int main() {
    return 0;
}
```

## Good

```cpp
// config.hpp
struct Config {
    int retries;
    int timeout;
};

// a.cpp and b.cpp both include config.hpp

int main() {
    return 0;
}
```

## See Also

- [cpp-proj-header-class-definition](proj-header-class-definition.md) - putting the type where users see it
- [cpp-proj-header-declares](proj-header-declares.md) - the same one-definition rule for functions
