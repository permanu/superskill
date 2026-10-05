---
id: cpp-proj-inline-variables
lang: cpp
prefix: proj
title: Share header constants with inline variables
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inline-variable, constexpr, headers, linkage]
  files: ["**/*.hpp", "**/*.h"]
  symbols: [inline]
related: [cpp-proj-header-inline, cpp-proj-no-unnamed-header]
sources:
  - title: cppreference - inline specifier
    url: https://en.cppreference.com/w/cpp/language/inline
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> A non-inline const in a header gives every translation unit its own object.

## Why

The inline reference records the change inline variables brought: inline const variables at namespace scope have external linkage by default, unlike the non-inline const-qualified variables, whose const gives them internal linkage (the cv reference notes the linkage rule as well). A plain `const int` in a header therefore produces one distinct object per including translation unit — fine for a value, wrong the moment address identity or ODR expectations matter. `inline constexpr` makes the constant one entity across the program and is the header-only-library enabler the reference names.

## Bad

```cpp
// widget.hpp
const int widget_limit = 42; // internal linkage: one copy per translation unit

int main() {
    return widget_limit == 42 ? 0 : 1;
}
```

## Good

```cpp
// widget.hpp
inline constexpr int widget_limit = 42; // one entity across translation units

int main() {
    return widget_limit == 42 ? 0 : 1;
}
```

## See Also

- [cpp-proj-header-inline](proj-header-inline.md) - the same keyword for functions
- [cpp-proj-no-unnamed-header](proj-no-unnamed-header.md) - the wrong way to scope header state
