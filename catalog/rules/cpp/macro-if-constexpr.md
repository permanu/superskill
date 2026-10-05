---
id: cpp-macro-if-constexpr
lang: cpp
prefix: macro
title: Use if constexpr for compile-time branches; keep #if for feature detection
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [if-constexpr, preprocessor, branching, discard]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [if constexpr]
related: [cpp-macro-has-include, cpp-macro-constexpr]
sources:
  - title: cppreference - if statement
    url: https://en.cppreference.com/w/cpp/language/if
  - title: cppreference - Conditional inclusion
    url: https://en.cppreference.com/w/cpp/preprocessor/conditional
---
> if constexpr branches in the language; #if branches before the language even starts.

## Why

A constexpr if statement evaluates a constant condition and discards the branch that is not taken, so the code participates in ordinary name lookup, scoping, and type checking while the branch selection happens at compile time. The reference draws the boundary precisely: outside a template a discarded statement is still fully checked, and `if constexpr` is not a substitute for `#if` — the preprocessor remains the tool when code cannot be parsed for some target. Feature detection and configuration stay with the preprocessor; constant-expression branching belongs in the language.

## Bad

```cpp
#include <cstdint>

int main() {
#if INTPTR_MAX == INT64_MAX
    const std::int64_t pointer_bytes = 8;
#else
    const std::int64_t pointer_bytes = 4;
#endif
    return pointer_bytes > 0 ? 0 : 1;
}
```

## Good

```cpp
#include <cstdint>

constexpr std::int64_t pointer_bytes() {
    if constexpr (sizeof(void*) == 8)
        return 8;
    else
        return 4;
}

int main() {
    return pointer_bytes() > 0 ? 0 : 1;
}
```

## See Also

- [cpp-macro-has-include](macro-has-include.md) - the preprocessor task it should keep
- [cpp-macro-constexpr](macro-constexpr.md) - constants that replace object-like macros
