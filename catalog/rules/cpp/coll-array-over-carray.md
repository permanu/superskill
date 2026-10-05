---
id: cpp-coll-array-over-carray
lang: cpp
prefix: coll
title: Use std::array instead of a C array
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [array, c-array, size, decay]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::array]
related: [cpp-coll-vector-default, cpp-mem-buffer-vector-byte]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::array
    url: https://en.cppreference.com/w/cpp/container/array
---
> std::array keeps the layout and gains the size, assignment, and iterators.

## Why

SL.con.1 asks for `std::array` or `std::vector` instead of a C array. `std::array` has the same representation as a C array but knows its own size, supports assignment and comparison, and does not decay to a pointer when passed — the reference lists exactly those gains. A C array loses its length the moment it is used as an argument, which is where the manual `sizeof` arithmetic and the out-of-bounds accesses begin.

## Bad

```cpp
#include <cstddef>

int main() {
    int values[4] = {1, 2, 3, 4};
    std::size_t count = sizeof(values) / sizeof(values[0]); // size by hand
    return count == 4 ? 0 : 1;
}
```

## Good

```cpp
#include <array>

int main() {
    std::array<int, 4> values{1, 2, 3, 4};
    return values.size() == 4 ? 0 : 1; // knows its own size
}
```

## See Also

- [cpp-coll-vector-default](coll-vector-default.md) - the resizable default
- [cpp-mem-buffer-vector-byte](mem-buffer-vector-byte.md) - byte storage as a container
