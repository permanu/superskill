---
id: cpp-mem-overwrite-buffers
lang: cpp
prefix: mem
title: Skip value-initialization for buffers that will be overwritten entirely
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [make_unique_for_overwrite, buffer, initialization, zeroing]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::make_unique_for_overwrite]
related: [cpp-mem-buffer-vector-byte, cpp-perf-measure-first]
sources:
  - title: cppreference - std::make_unique
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr/make_unique
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> Allocate with make_unique_for_overwrite when the first use fills every element.

## Why

`make_unique<T[]>(n)` value-initializes the array, writing zeros to memory that the next loop overwrites, which doubles the memory traffic for large buffers. `std::make_unique_for_overwrite` default-initializes instead: the allocation is returned without the write pass. The choice is only safe when the code fills the buffer before reading any byte of it.

## Bad

```cpp
#include <cstddef>
#include <memory>

void fill(unsigned char* data, std::size_t size);

int main() {
    auto buffer = std::make_unique<unsigned char[]>(4096); // zeroes 4096 bytes first
    fill(buffer.get(), 4096); // every byte overwritten anyway
}
```

## Good

```cpp
#include <cstddef>
#include <memory>

void fill(unsigned char* data, std::size_t size);

int main() {
    auto buffer = std::make_unique_for_overwrite<unsigned char[]>(4096); // no zeroing
    fill(buffer.get(), 4096);
}
```

## See Also

- [cpp-mem-buffer-vector-byte](mem-buffer-vector-byte.md) - the owning container alternative
- [cpp-perf-measure-first](perf-measure-first.md) - measuring large-buffer workloads
