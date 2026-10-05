---
id: cpp-tmpl-specialization
lang: cpp
prefix: tmpl
title: Specialize class templates for irregular types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [specialization, class-template, irregular-types]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [template]
related: [cpp-tmpl-specialize-function, cpp-trait-check-class]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Explicit (full) template specialization
    url: https://en.cppreference.com/w/cpp/language/template_specialization
---
> The primary template covers the common case; a specialization covers the exception.

## Why

T.64 asks to use specialization to provide alternative implementations of class templates. The specialization reference defines the mechanism: `template <>` before a declaration customizes the template for one set of arguments, and the specialization must be declared before the first use that would cause implicit instantiation. Types with irregular behavior — a string whose size is its content, not its object — get their own definition of the same interface, while every other type keeps the primary one.

## Bad

```cpp
#include <string>

template <class T>
struct WireSize {
    static std::size_t of(const T& value) { return sizeof(value); } // wrong for strings
};

int main() {
    return WireSize<std::string>::of(std::string{"abc"}) == sizeof(std::string) ? 0 : 1;
}
```

## Good

```cpp
#include <string>

template <class T>
struct WireSize {
    static std::size_t of(const T& value) { return sizeof(value); }
};

template <>
struct WireSize<std::string> { // full specialization for the irregular type
    static std::size_t of(const std::string& value) { return value.size(); }
};

int main() {
    return WireSize<std::string>::of(std::string{"abc"}) == 3 ? 0 : 1;
}
```

## See Also

- [cpp-tmpl-specialize-function](tmpl-specialize-function.md) - why functions take the overload path instead
- [cpp-trait-check-class](trait-check-class.md) - stating what the specialized interface models
