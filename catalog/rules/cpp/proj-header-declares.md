---
id: cpp-proj-header-declares
lang: cpp
prefix: proj
title: Headers declare; source files define
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [headers, definitions, odr, declarations]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-proj-header-inline, cpp-proj-header-class-definition]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Definitions and ODR
    url: https://en.cppreference.com/w/cpp/language/definition
---
> A definition in a header becomes one definition per translation unit.

## Why

SF.2 states it directly: a header file must not contain object definitions or non-inline function definitions. The ODR page explains the consequence: one and only one definition of every non-inline function or variable that is odr-used is required to appear in the entire program, and violating that rule is undefined behavior the compiler need not diagnose. A header included by ten source files with a function definition in it produces ten definitions; the fix is a declaration in the header and the definition in one source file.

## Bad

```cpp
// widget.hpp, included from several .cpp files
int widget_count() {
    return 42; // a definition in a header: one copy per translation unit
}

int main() {
    return widget_count() == 42 ? 0 : 1;
}
```

## Good

```cpp
// widget.hpp
int widget_count(); // declares

// widget.cpp
int widget_count() {
    return 42; // the one definition
}

int main() {
    return widget_count() == 42 ? 0 : 1;
}
```

## See Also

- [cpp-proj-header-inline](proj-header-inline.md) - when a header definition is unavoidable
- [cpp-proj-header-class-definition](proj-header-class-definition.md) - the types that do belong in headers
