---
id: cpp-mem-no-smartptr-subscript
lang: cpp
prefix: mem
title: Do not subscript smart pointers; use a container for sequences
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [smart-pointer, subscript, array, vector]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::unique_ptr, "operator[]"]
related: [cpp-raii-unique-default, cpp-mem-buffer-vector-byte]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Do not use operator[] on a smart pointer; a pointer is not a container.

## Why

Subscripting a `unique_ptr<T[]>` hides the fact that the pointer has no size and performs no bounds checking; the code reads like container access while the size lives in a separate variable. The `[]` overload exists only on the array specialization, so changing the element type or deleter silently removes it. Containers carry their size and keep the access safe and uniform.

## Bad

```cpp
#include <memory>

void fill(std::unique_ptr<int[]>& values, int count) {
    for (int i = 0; i < count; ++i)
        values[i] = i; // looks like a container; size is tracked separately
}
```

## Good

```cpp
#include <vector>

void fill(std::vector<int>& values) {
    for (std::size_t i = 0; i < values.size(); ++i)
        values[i] = static_cast<int>(i); // size travels with the data
}
```

## See Also

- [cpp-raii-unique-default](raii-unique-default.md) - ownership types for single objects
- [cpp-mem-buffer-vector-byte](mem-buffer-vector-byte.md) - containers for raw byte buffers
