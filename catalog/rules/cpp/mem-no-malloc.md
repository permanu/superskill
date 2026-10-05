---
id: cpp-mem-no-malloc
lang: cpp
prefix: mem
title: Avoid malloc and free; allocate with C++ facilities that run constructors
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [malloc, free, allocation, construction]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::malloc, std::free]
related: [cpp-mem-matched-alloc-free, cpp-raii-no-naked-new]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Use containers and smart pointers for dynamic memory, not malloc and free.

## Why

`malloc` returns raw bytes: it does not run constructors, does not throw on failure, and its result must be paired with `free` by hand. C++ allocation facilities construct the object as part of allocating, throw `std::bad_alloc` on failure, and hand ownership to a container or smart pointer that releases it. Mixing the two worlds is where type errors and leaks come from.

## Bad

```cpp
#include <cstdlib>
#include <cstring>

char* duplicate(const char* text) {
    const std::size_t size = std::strlen(text) + 1;
    char* copy = static_cast<char*>(std::malloc(size));
    std::memcpy(copy, text, size); // caller must free; no constructor ran
    return copy;
}
```

## Good

```cpp
#include <string>

std::string duplicate(const char* text) {
    return std::string(text); // constructs, owns, and frees its buffer
}
```

## See Also

- [cpp-mem-matched-alloc-free](mem-matched-alloc-free.md) - keeping allocation and deallocation forms paired
- [cpp-raii-no-naked-new](raii-no-naked-new.md) - owners instead of manual release
