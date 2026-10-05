---
id: cpp-macro-unique-prefix
lang: cpp
prefix: macro
title: Give every macro a unique, project-prefixed name
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, macros, collision, prefix]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-macro-all-caps, cpp-macro-undef-helper]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> A macro ignores namespaces; its name is claimed in every file that includes the header.

## Why

ES.33: if you must use macros, give them unique names. A macro has no scope, so its name competes with every other name in every translation unit that includes the header — including the standard library's. The preprocessor reference makes some collisions outright forbidden: a translation unit that includes a standard library header may not define or undefine names declared in any standard library header, and defining keywords or standard attribute tokens is undefined behavior. A project prefix keeps ordinary names for ordinary code and makes the remaining collisions detectable.

## Bad

```cpp
#define COUNT 10 // generic name leaks into every includer

int main() {
    return COUNT == 10 ? 0 : 1;
}
```

## Good

```cpp
#define WIRE_COUNT 10 // project prefix avoids collisions

int main() {
    return WIRE_COUNT == 10 ? 0 : 1;
}
```

## See Also

- [cpp-macro-all-caps](macro-all-caps.md) - making macros visible as macros
- [cpp-macro-undef-helper](macro-undef-helper.md) - removing the name when its job ends
