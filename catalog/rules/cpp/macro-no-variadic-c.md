---
id: cpp-macro-no-variadic-c
lang: cpp
prefix: macro
title: Use variadic templates, not C-style variadic functions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [variadic, va_list, templates, type-safety]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [va_list, va_arg]
related: [cpp-macro-inline-function, cpp-obs-format]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> va_arg trusts the caller to name the right type; a variadic template checks it.

## Why

ES.34 asks not to define a C-style variadic function: the argument list is untyped, so `va_arg` must be told the type it should read and reading a different one is undefined behavior, while the count is an unchecked convention the caller can get wrong. A variadic template instantiates for the actual argument types, so every call is type-checked, and a fold expression applies the operation without runtime iteration over untyped storage. The macro-related reason stands too: these interfaces pair with macros and format strings that move type errors to run time.

## Bad

```cpp
#include <cstdarg>

int sum(int count, ...) { // C-style variadic: no type checking
    va_list args;
    va_start(args, count);
    int total = 0;
    for (int i = 0; i < count; ++i)
        total += va_arg(args, int);
    va_end(args);
    return total;
}

int main() {
    return sum(2, 1, 2) == 3 ? 0 : 1;
}
```

## Good

```cpp
template <class... Values>
int sum(Values... values) { // variadic template: type-checked
    return (values + ...);
}

int main() {
    return sum(1, 2) == 3 ? 0 : 1;
}
```

## See Also

- [cpp-macro-inline-function](macro-inline-function.md) - replacing text-level argument handling
- [cpp-obs-format](obs-format.md) - the type-checked replacement for format strings
