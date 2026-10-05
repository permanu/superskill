---
id: cpp-mem-matched-alloc-free
lang: cpp
prefix: mem
title: Match every allocation with its corresponding deallocation form
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [new, delete, array, mismatch, deallocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: ["new[]", "delete[]", std::free]
related: [cpp-mem-no-malloc, cpp-raii-raw-non-owning]
sources:
  - title: cppreference - delete expression
    url: https://en.cppreference.com/w/cpp/language/delete
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Pair new with delete, new[] with delete[], and malloc with free; mixing them is undefined behavior.

## Why

The delete expression must receive a pointer obtained from the matching new form: `delete` on memory from `new[]` or `delete[]` on memory from `new` is undefined behavior, and freeing C-allocated memory with `delete` (or the reverse) is worse because the allocator metadata does not match. The pairing is invisible in the source, which is why owning containers and smart pointers should perform both halves.

## Bad

```cpp
#include <cstdlib>

void process() {
    int* single = new int(1);
    int* array = new int[4];
    std::free(single); // mismatched: new with free
    delete array;      // mismatched: new[] with delete
}
```

## Good

```cpp
#include <memory>
#include <vector>

void process() {
    auto single = std::make_unique<int>(1); // new with delete, via unique_ptr
    std::vector<int> array(4);              // new[] with delete[], via vector
}
```

## See Also

- [cpp-mem-no-malloc](mem-no-malloc.md) - why the C allocation pair should not appear at all
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - owners that keep the pairing internal
