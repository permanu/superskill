---
id: cpp-macro-include-guard
lang: cpp
prefix: macro
title: Wrap every header in an include guard
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [include, guard, pragma-once, headers]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-macro-has-include, cpp-macro-unique-prefix]
sources:
  - title: cppreference - Source file inclusion
    url: https://en.cppreference.com/w/cpp/preprocessor/include
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> A header included twice defines its contents twice; the guard makes the second pass empty.

## Why

The include reference states the purpose directly: to avoid repeated inclusion of the same file and endless recursion when a file includes itself, headers are wrapped in `#ifndef` / `#define` / `#endif` with a name uniquely mapped to the file. Without the guard, a header reached through two include paths is processed twice, and its classes, functions, and macros are defined twice — a compile error for the first redefinition the compiler finds. Many compilers also implement the non-standard `#pragma once` with the same effect.

## Bad

```cpp
// widget.hpp, included twice, would define Widget twice
struct Widget {
    int id = 0;
};

int main() {
    return 0;
}
```

## Good

```cpp
#ifndef WIDGET_HPP
#define WIDGET_HPP

struct Widget {
    int id = 0;
};

#endif

int main() {
    return 0;
}
```

## See Also

- [cpp-macro-has-include](macro-has-include.md) - the other #include-time concern
- [cpp-macro-unique-prefix](macro-unique-prefix.md) - why the guard name must be unique
