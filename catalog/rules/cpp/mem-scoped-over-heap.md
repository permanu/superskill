---
id: cpp-mem-scoped-over-heap
lang: cpp
prefix: mem
title: Prefer scoped objects; do not heap-allocate what a local can own
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stack, heap, scoped, allocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::array, new]
related: [cpp-raii-wrap-resources, cpp-mem-no-malloc]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Use automatic storage for objects whose lifetime matches the scope; heap only when needed.

## Why

A heap allocation for a fixed-size local buys indirection, an allocation failure path, and cleanup responsibility in exchange for nothing. Scoped objects are freed automatically, are faster to create, and keep the object's address stable within the scope. Heap allocation remains right when the size is not known until run time, when the object must outlive the scope, or when ownership must be transferred.

## Bad

```cpp
#include <memory>

int compute_total(const int* data, int size);

int main() {
    std::unique_ptr<int[]> values(new int[100]); // heap for a fixed-size local
    for (int i = 0; i < 100; ++i)
        values[i] = i;
    return compute_total(values.get(), 100);
}
```

## Good

```cpp
#include <array>

int compute_total(const int* data, int size);

int main() {
    std::array<int, 100> values{}; // automatic storage, no allocation
    for (int i = 0; i < 100; ++i)
        values[i] = i;
    return compute_total(values.data(), 100);
}
```

## See Also

- [cpp-raii-wrap-resources](raii-wrap-resources.md) - when heap ownership is needed, wrap it
- [cpp-mem-no-malloc](mem-no-malloc.md) - the C allocation functions to avoid entirely
