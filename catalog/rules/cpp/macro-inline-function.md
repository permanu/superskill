---
id: cpp-macro-inline-function
lang: cpp
prefix: macro
title: Use inline functions, not function-like macros
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [define, function-like, substitution, arguments]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [constexpr, inline]
related: [cpp-macro-constexpr, cpp-macro-no-side-effects]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> Macro arguments are substituted textually at each occurrence; functions evaluate once.

## Why

The preprocessor documentation describes function-like macros as taking comma-separated arguments that "replace corresponding occurrences of any of the parameters in the replacement-list" — pure text substitution. An argument that appears twice is evaluated twice, the expression tree changes with the caller's operators unless every parameter and the whole body are parenthesized, and the argument's type is never checked. A function (constexpr, inline where needed) evaluates its arguments once, type-checks them, and obeys scope.

## Bad

```cpp
#define SQUARE(x) x * x // no parentheses, argument substituted twice

int main() {
    return SQUARE(1 + 2) == 9 ? 0 : 1; // expands to 1 + 2 * 1 + 2
}
```

## Good

```cpp
constexpr int square(int x) {
    return x * x; // arguments evaluated once, with a type
}

int main() {
    return square(1 + 2) == 9 ? 0 : 1;
}
```

## See Also

- [cpp-macro-constexpr](macro-constexpr.md) - the constant half of ES.31
- [cpp-macro-no-side-effects](macro-no-side-effects.md) - the evaluation-count trap in detail
