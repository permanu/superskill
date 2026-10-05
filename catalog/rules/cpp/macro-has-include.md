---
id: cpp-macro-has-include
lang: cpp
prefix: macro
title: Detect optional headers with __has_include before including them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [has_include, optional, portability, include]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-macro-include-guard, cpp-macro-if-constexpr]
sources:
  - title: cppreference - Source file inclusion
    url: https://en.cppreference.com/w/cpp/preprocessor/include
  - title: cppreference - Conditional inclusion
    url: https://en.cppreference.com/w/cpp/preprocessor/conditional
---
> __has_include answers whether the header is there; the include can then be conditional.

## Why

`__has_include` evaluates to `1` when the named header or source file can be found, and it may be used in the expression of `#if` and `#elif` — the reference lists it among the preprocessing-exclusive expressions. Wrapping an optional include in the check keeps the translation unit compilable on implementations that lack the header, with a fallback path for the code that used it. The same reference adds a caution worth keeping: a result of `1` means the file exists, not that including it is safe or useful.

## Bad

```cpp
#include <optional> // required unconditionally

int main() {
    return 0;
}
```

## Good

```cpp
#if __has_include(<optional>)
#include <optional>
#define HAS_OPTIONAL 1
#else
#define HAS_OPTIONAL 0
#endif

int main() {
    return HAS_OPTIONAL ? 0 : 1;
}
```

## See Also

- [cpp-macro-include-guard](macro-include-guard.md) - the other #include-time guard
- [cpp-macro-if-constexpr](macro-if-constexpr.md) - choosing between preprocessor and language branching
