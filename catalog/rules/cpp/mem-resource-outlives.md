---
id: cpp-mem-resource-outlives
lang: cpp
prefix: mem
title: A memory resource must outlive every container that uses it
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pmr, lifetime, allocator, resource]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::pmr::memory_resource, polymorphic_allocator]
related: [cpp-mem-monotonic-resource, cpp-raii-raw-non-owning]
sources:
  - title: cppreference - std::pmr::memory_resource
    url: https://en.cppreference.com/w/cpp/memory/memory_resource
  - title: cppreference - std::pmr::monotonic_buffer_resource
    url: https://en.cppreference.com/w/cpp/memory/monotonic_buffer_resource
---
> Keep the memory resource alive at least as long as the pmr objects allocated from it.

## Why

A `std::pmr` container stores only a pointer to its `memory_resource`; it does not share ownership. If the resource is destroyed first, the container's later growth or destruction calls `deallocate` on a dangling pointer, and for a monotonic resource the memory itself is released while objects still reference it. Declaring the resource before its users in the same scope makes destruction order guarantee the resource outlives them.

## Bad

```cpp
#include <memory_resource>
#include <vector>

std::pmr::vector<int> make_values() {
    std::pmr::monotonic_buffer_resource resource; // destroyed on return
    std::pmr::vector<int> values{&resource};
    values.push_back(1);
    return values; // values now points at a dead resource
}
```

## Good

```cpp
#include <memory_resource>
#include <vector>

void fill_values() {
    std::pmr::monotonic_buffer_resource resource; // declared first
    std::pmr::vector<int> values{&resource};      // so it outlives values
    values.push_back(1);
} // values destroyed first, then the resource
```

## See Also

- [cpp-mem-monotonic-resource](mem-monotonic-resource.md) - the resource pattern this contract protects
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - pointers that do not own need a lifetime guarantee
