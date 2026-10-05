---
id: cpp-macro-constexpr
lang: cpp
prefix: macro
title: Use constexpr constants, not object-like macros
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [define, constants, constexpr, substitution]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [constexpr]
related: [cpp-macro-inline-function, cpp-perf-constexpr]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - constexpr specifier
    url: https://en.cppreference.com/w/cpp/language/constexpr
---
> A macro is text with no type and no scope; constexpr is a value.

## Why

ES.31 asks not to use macros for constants or "functions". An object-like macro has no type, no scope, and no address: it is replaced wherever it appears, including inside unrelated identifiers' neighborhoods, and it cannot be found by a debugger or a symbol tool. A `constexpr` constant is a real declaration — typed, scoped, and usable in constant expressions — so every rule the language has for names applies to it.

## Bad

```cpp
#define MAX_RETRIES 5 // untyped text substitution

int main() {
    return MAX_RETRIES == 5 ? 0 : 1;
}
```

## Good

```cpp
constexpr int max_retries = 5; // a typed, scoped constant

int main() {
    return max_retries == 5 ? 0 : 1;
}
```

## See Also

- [cpp-macro-inline-function](macro-inline-function.md) - the same rule for function-like macros
- [cpp-perf-constexpr](perf-constexpr.md) - computing constants at compile time
