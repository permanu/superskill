---
id: cpp-mem-aligned-new
lang: cpp
prefix: mem
title: Let new honor over-aligned types instead of allocating with malloc
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [alignment, alignas, new, malloc]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [alignas, operator new]
related: [cpp-mem-no-malloc, cpp-mem-matched-alloc-free]
sources:
  - title: cppreference - new expression
    url: https://en.cppreference.com/w/cpp/language/new
  - title: cppreference - alignas specifier
    url: https://en.cppreference.com/w/cpp/language/alignas
---
> Allocate over-aligned types with new; it passes the alignment requirement to the allocator.

## Why

A type declared `alignas(32)` requires storage at a 32-byte boundary, but `malloc` only guarantees alignment for fundamental types, so the cast and use of that memory can be misaligned. The new expression detects that the alignment exceeds the default and calls the aligned allocation overload with the requirement, returning storage that satisfies `alignof(T)`. The matching delete expression likewise selects the aligned deallocation function.

## Bad

```cpp
#include <cstddef>
#include <cstdlib>

struct alignas(32) Vector8f {
    float data[8];
};

Vector8f* allocate_vectors(std::size_t count) {
    // Bad: malloc does not honor alignas(32).
    return static_cast<Vector8f*>(std::malloc(count * sizeof(Vector8f)));
}
```

## Good

```cpp
#include <cstddef>

struct alignas(32) Vector8f {
    float data[8];
};

Vector8f* allocate_vectors(std::size_t count) {
    return new Vector8f[count]; // new honors alignof(Vector8f)
}
```

## See Also

- [cpp-mem-no-malloc](mem-no-malloc.md) - the allocation function that ignores alignment
- [cpp-mem-matched-alloc-free](mem-matched-alloc-free.md) - deleting aligned allocations correctly
