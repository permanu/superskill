---
id: cpp-pat-compile-time
lang: cpp
prefix: pat
title: Prefer compile-time checking to run-time checking
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static-assert, compile-time, preconditions]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [static_assert]
related: [cpp-test-static-assert, cpp-trait-check-class]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - static_assert declaration
    url: https://en.cppreference.com/w/cpp/language/static_assert
---
> A check the compiler can run costs nothing and cannot be skipped.

## Why

P.5 asks to prefer compile-time checking to run-time checking. The static_assert reference documents the tool: the declaration performs compile-time assertion checking, and a failing assertion stops the build with its message. A run-time assert of a property the compiler already knows is worse on every axis — it runs in some build modes only, can be compiled out, costs a branch, and reports the failure to a user instead of to the author.

## Bad

```cpp
#include <cassert>

template <class T>
void use() {
    assert(sizeof(T) >= 4); // checked at run time, and only in debug builds
}

int main() {
    use<int>();
    return 0;
}
```

## Good

```cpp
template <class T>
void use() {
    static_assert(sizeof(T) >= 4, "T must be at least four bytes"); // checked at build time
}

int main() {
    use<int>();
    return 0;
}
```

## See Also

- [cpp-test-static-assert](test-static-assert.md) - the same tool for test invariants
- [cpp-trait-check-class](trait-check-class.md) - asserting which concepts a class models
