---
id: cpp-macro-no-side-effects
lang: cpp
prefix: macro
title: Never pass side-effecting arguments to a function-like macro
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macros, side-effects, evaluation, arguments]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-macro-inline-function, cpp-macro-no-program-text]
sources:
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> A parameter used twice evaluates its argument twice; a branch may decide which.

## Why

Macro arguments are substituted textually into each occurrence of the parameter, so an argument that increments, allocates, or reads input runs once per occurrence — and which occurrences execute depends on the branches the expansion takes. The reference describes the mechanism plainly: arguments "replace corresponding occurrences of any of the parameters in the replacement-list". A function call has no such ambiguity: each argument expression is evaluated exactly once, before the call.

## Bad

```cpp
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int next() {
    return 2;
}

int main() {
    return MAX(next(), 3) == 3 ? 0 : 1; // next() may run twice
}
```

## Good

```cpp
int next() {
    return 2;
}

int max_of(int a, int b) {
    return a > b ? a : b; // each argument evaluated once
}

int main() {
    return max_of(next(), 3) == 3 ? 0 : 1;
}
```

## See Also

- [cpp-macro-inline-function](macro-inline-function.md) - replacing the macro with a function
- [cpp-macro-no-program-text](macro-no-program-text.md) - the larger rule against macro-generated code
