---
id: cpp-ffi-cpp-calling-c
lang: cpp
prefix: ffi
title: Wrap C interfaces in RAII types on the C++ side
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [raii, wrapper, c-api, handles]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-ffi-prefer-cpp, cpp-raii-wrap-resources]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - PImpl
    url: https://en.cppreference.com/w/cpp/language/pimpl
---
> The C interface stays C; the C++ caller gets constructors, destructors, and errors.

## Why

CPL.3 asks that when C is used for an interface, the calling code use C++ around it. The C API hands out raw handles and reports failures through return codes and out-parameters; C++ code that consumes them directly repeats the cleanup and the checks at every call site. Wrapping the handle in a type whose destructor releases it — the pimpl idea applied to foreign resources — makes ownership automatic and keeps the error translation in one place, while the boundary itself remains plain C.

## Bad

```cpp
#include <cstdlib>

int main() {
    void* handle = std::malloc(64); // raw C handle used directly
    if (handle == nullptr)
        return 1;
    std::free(handle);
    return 0;
}
```

## Good

```cpp
#include <cstdlib>
#include <memory>

int main() {
    const auto handle = std::unique_ptr<void, decltype(&std::free)>(
        std::malloc(64), &std::free); // RAII wrapper around the C resource
    return handle != nullptr ? 0 : 1;
}
```

## See Also

- [cpp-ffi-prefer-cpp](ffi-prefer-cpp.md) - minimizing how much C remains
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - the general wrapping pattern
