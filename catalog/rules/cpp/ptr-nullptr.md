---
id: cpp-ptr-nullptr
lang: cpp
prefix: ptr
title: Use nullptr for null pointers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nullptr, "null", pointer-literal]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [nullptr]
related: [cpp-raii-raw-non-owning, cpp-unsafe-no-deref-invalid]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - nullptr
    url: https://en.cppreference.com/w/cpp/language/nullptr
---
> nullptr has type std::nullptr_t; NULL is a macro that expands to an integer constant.

## Why

ES.47 asks to use nullptr rather than 0 or NULL. The nullptr reference states that the keyword denotes the pointer literal, a prvalue of type std::nullptr_t, with implicit conversions to the null pointer value of any pointer type — and its example shows the practical difference: a template that clones its argument accepts `clone(nullptr)` but rejects `clone(NULL)` and `clone(0)`, because a non-literal zero cannot be a null pointer constant. Overloads and template deduction see a pointer, not a number.

## Bad

```cpp
#include <cstddef>

int main() {
    int* value = NULL; // an integer macro, not a pointer literal
    return value == 0 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    int* value = nullptr; // the pointer literal
    return value == nullptr ? 0 : 1;
}
```

## See Also

- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - what a raw pointer means when it is not null
- [cpp-unsafe-no-deref-invalid](unsafe-no-deref-invalid.md) - what happens when the null value is used
