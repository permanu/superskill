---
id: cpp-proj-header-inline
lang: cpp
prefix: proj
title: Definitions that must live in a header are inline
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inline, headers, definitions, odr]
  files: ["**/*.hpp", "**/*.h"]
  symbols: [inline]
related: [cpp-proj-header-declares, cpp-proj-inline-variables]
sources:
  - title: cppreference - inline specifier
    url: https://en.cppreference.com/w/cpp/language/inline
  - title: cppreference - Definitions and ODR
    url: https://en.cppreference.com/w/cpp/language/definition
---
> The inline keyword means "multiple definitions permitted", which is what a header needs.

## Why

The inline reference explains that an inline function with external linkage may have more than one definition in the program as long as each definition appears in a different translation unit and all definitions are identical — which is exactly the situation a header creates — and its example shows a header defining an inline function and an inline variable for multiple source files. A plain function defined in a header has no such permission, so the ODR is violated as soon as two translation units include it. Templates and constexpr functions are implicitly inline.

## Bad

```cpp
// widget.hpp
int widget_count() { // non-inline definition in a header
    return 42;
}

int main() {
    return widget_count() == 42 ? 0 : 1;
}
```

## Good

```cpp
// widget.hpp
inline int widget_count() { // multiple definitions permitted
    return 42;
}

int main() {
    return widget_count() == 42 ? 0 : 1;
}
```

## See Also

- [cpp-proj-header-declares](proj-header-declares.md) - moving the definition out instead
- [cpp-proj-inline-variables](proj-inline-variables.md) - the same keyword for variables
